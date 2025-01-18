#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os.path
import tempfile
from collections import namedtuple
from pytest import skip


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection, appconfig_contains, web2py_app_dir
# Create request.folder for use below
request_obj = namedtuple('request_obj', 'folder')
request = request_obj(folder=web2py_app_dir)

#copied from db.py
local_pic_path = lambda src, src_id: os.path.join(
        request.folder,'static','FinalOutputs','img', str(src), str(src_id)[-3:])

class TestImageFiles(object):
    @classmethod
    def setup_class(self):
        self.db = get_db_connection()

    @classmethod    
    def teardown_class(self):
        pass
    
    def test_all_images_in_db_present_locally(self):
        """
        All image numbers in the DB should have thumbnails on disk (takes a while: dots give batches)
        Will output the otts and numbers in line batches to a temporary file, so they can be re-harvested
        """
        reporting_batch_size = 100
        if appconfig_contains("url_base=", "images"):
            skip("This OneZoom instance is not using local image thumbnails")
        else:
            tmpfiles = []
            db_cursor = self.db['connection'].cursor()
            for sql in [
                "SELECT src, src_id, ott from `{}`".format('images_by_ott'),
                "SELECT verified_preferred_image_src, verified_preferred_image_src_id, OTT_ID from `{}` where verified_preferred_image_src IS NOT NULL".format('reservations')]:
                db_cursor.execute(sql)
                otts=set()
                fns=set()
                for row in db_cursor:
                    #should correct this from line 48/49 of db.py
                    if not os.path.isfile(os.path.join(local_pic_path(row[0], row[1]), str(row[1])+".jpg")):
                        if not tmpfiles:
                            tmpfiles.append(tempfile.NamedTemporaryFile(mode="w+t", delete=False))
                            tmpfiles.append(tempfile.NamedTemporaryFile(mode="w+t", delete=False))
                        fns.add("{}/{}".format(row[0], row[1]))
                        otts.add(str(int(row[2])))
                        if (len(fns) == reporting_batch_size):
                            print(".", flush=True)
                            print(" ".join(fns), file=tmpfiles[0])
                            print(" ".join(otts), file=tmpfiles[1])
                            fns.clear()
                            otts.clear()
                self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            db_cursor.close() 
            if len(fns) or len(otts):
                print(" ".join(fns), file=tmpfiles[0])
                print(" ".join(otts), file=tmpfiles[1])
            fn0=fn1=None
            if tmpfiles:
                fn0 = tmpfiles[0].name
                tmpfiles[0].close()
                fn1 = tmpfiles[1].name
                tmpfiles[1].close()
            if fn0 or fn1:
                assert False, "Some images present in DB but not on disk. Image numbers saved to {} and otts to {}".format(fn0, fn1)
