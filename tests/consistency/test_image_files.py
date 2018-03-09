#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os.path
import tempfile
from nose import SkipTest


if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection, appconfig_contains, web2py_app_dir

class TestImageFiles(object):
    @classmethod
    def setUpClass(self):
        self.db = get_db_connection()

    @classmethod    
    def tearDownClass(self):
        pass
    
    def test_all_images_in_db_present_locally(self):
        """
        All image numbers in the DB should have thumbnails on disk (takes a while: dots give batches)
        Will output the otts and numbers in line batches to a temporary file, so they can be re-harvested
        """
        reporting_batch_size = 100
        if appconfig_contains("pics_dir=", "general"):
            raise SkipTest("This OneZoom instance is not using local image thumbnails")
        else:
            tmpfiles = []
            db_cursor = self.db['connection'].cursor()
            sql = "SELECT src_id, ott from `{}` where (src=1 or src=2) group by src_id, ott".format('images_by_ott')
            db_cursor.execute(sql)
            otts=set()
            fns=set()
            for row in db_cursor:
                #should correct this from line 48/49 of db.py
                if not os.path.isfile(os.path.join(web2py_app_dir, 'static','FinalOutputs','pics', str(row[0])+".jpg")):
                    if not tmpfiles:
                        tmpfiles.append(tempfile.NamedTemporaryFile(mode="w+t", delete=False))
                        tmpfiles.append(tempfile.NamedTemporaryFile(mode="w+t", delete=False))
                    fns.add(str(int(row[0])))
                    otts.add(str(int(row[1])))
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
