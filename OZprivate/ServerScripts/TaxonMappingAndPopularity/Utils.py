#!/usr/bin/env python3
'''
Utility routines, e.g. for reading size of large files to produce progress monitors
'''
import sys
import os
import io
import bz2
import gzip
import resource

# from https://stackoverflow.com/a/52213302/
class ProgressFileWrapper(io.TextIOBase):
    """
    A wrapper for firing off a progress bar callback when reading a text file
    Useful when using a routine that reads a text file in one go
    """
    def __init__(self, file, callback):
        self.file = file
        self.callback = callback
    def read(self, size=-1):
        buf = self.file.read(size)
        if buf:
            self.callback(len(buf))
        return buf
    def readline(self, size=-1):
        buf = self.file.readline(size)
        if buf:
            self.callback(len(buf))
        return buf

class SimpleGZtextfile(object):
    """
    A gzip file reader where tell() gives the position in the uncompressed file
    """
    def __init__(self, filehandle, encoding):
        self.rawinput = filehandle
        self.uncompressed = io.TextIOWrapper(gzip.GzipFile(mode="rb", fileobj=self.rawinput), encoding=encoding)
    
    def size(self):
        return os.stat(self.rawinput.fileno()).st_size
    
    def tell(self):
        return self.rawinput.tell()
    
    def __iter__(self):
        return self.uncompressed
    
    def __next__(self):
        return next(self.uncompressed)


# from https://stackoverflow.com/a/15616994/
class SimpleBZ2File(object):
    """
    A bz2 file reader where tell() gives the position in the uncompressed file
    """
    def __init__(self, filehandle, readsize=1024):
        self.decomp = bz2.BZ2Decompressor()
        self.rawinput = filehandle
        self.eof = False
        self.readsize = readsize
        self.leftover = b''

    def size(self):
        return os.stat(self.rawinput.fileno()).st_size

    def tell(self):
        return self.rawinput.tell()

    def __iter__(self):
        while not self.eof:
            rawdata = self.rawinput.read(self.readsize)
            if rawdata == b'':
                self.eof = True
            else:
                data = self.decomp.decompress(rawdata)
                if not data:
                    continue #we need to supply more raw to decompress
                newlines = list(data.splitlines(True))
                yield self.leftover + newlines[0]
                self.leftover = b''
                for l in newlines[1:-1]:
                    yield l
                if newlines[-1].endswith(b'\n'):
                    yield newlines[-1]
                else:
                    self.leftover = newlines[-1]
        if self.leftover:
            yield self.leftover
        self.rawinput.close()

# see http://fa.bianp.net/blog/2013/different-ways-to-get-memory-consumption-or-lessons-learned-from-memory_profiler/
def memory_usage_resource():
    rusage_denom = 1024.
    if sys.platform == 'darwin':
        # ... it seems that in OSX the output is different units ...
        # perhaps update to try psutils instead
        rusage_denom = rusage_denom * rusage_denom
    mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / rusage_denom
    return mem

