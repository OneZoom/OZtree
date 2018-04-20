# -*- coding: utf-8 -*-
"""
From https://github.com/OneZoom/OZtree/issues/62

1) Test no js errors on main page (also that it zooms to the right place) - see http://blog.amolchavan.space/capture-javascript-console-error-using-selenium-webdriver/
2) Test the iframe popups
"""
import os.path
from nose import tools

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, make_temp_minlife_file, remove_temp_minlife_files


class TestTreeDataMismatch(FunctionalTest):
    """
    Test whether we get an error page if there is a version mismatch 
    This requires a bit of database adjusting, but not too dangerously (we swap 2 numbers, then swap back)
    """
    unused_version = -1 # set to a non-allowed (negative) tree version number

    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass() #will assign db etc
        self.temp_minlife = make_temp_minlife_file(self) #must do this before changing table IDs
        print(">> swapping data in row 1 of ordered_nodes table to force temporary mismatch")
        db_cursor = self.db['connection'].cursor()
        #parent of row 1 should contain the (negative) version number and real_parent should always be 0
        sql="UPDATE ordered_nodes set real_parent = parent where id = 1 LIMIT 1"
        db_cursor.execute(sql)
        sql="UPDATE ordered_nodes set parent = {} where id = 1 LIMIT 1".format(self.db['subs'])
        db_cursor.execute(sql, (-self.unused_version,)) # versions are stored as negative numbers
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        db_cursor.close()
    
    @classmethod
    def tearDownClass(self):
        remove_temp_minlife_files(self)
        print(">> restoring original version number to root node in database, and setting root node real_parent to 0")
        db_cursor = self.db['connection'].cursor()
        #parent of row 1 should contain the (negative) version number and real_parent should always be 0
        sql="UPDATE ordered_nodes set parent = real_parent WHERE id = 1 AND parent = {} LIMIT 1".format(self.db['subs'])
        db_cursor.execute(sql, (-self.unused_version,))
        sql="UPDATE ordered_nodes SET real_parent = {} where id = 1 LIMIT 1".format(self.db['subs'])
        db_cursor.execute(sql, (0,)) # real_parent of the root should always be 0
        self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        db_cursor.close()
        super().tearDownClass()


    @tools.nottest
    def test_mismatch(self, controller, base=base_url):
        self.browser.get(base + controller)
        wait = WebDriverWait(self.browser, 10)
        wait.until(EC.presence_of_element_located((By.ID, "version-error")))
        assert "version -1" in self.browser.find_element_by_tag_name("blockquote").text, \
            "On mismatch, {} tree should show the version number".format(controller)

    def test_life_mismatch(self):
        """
        The default tree viewer should show mismatch
        """
        self.test_mismatch("life")

    def test_life_MD_mismatch(self):
        """
        The museum display viewer should show mismatch
        """
        self.test_mismatch("life_MD")

    def test_expert_mode_mismatch(self):
        """
        The expert mode viewer (e.g. with screenshot functionality) should show mismatch
        """
        self.test_mismatch("life_expert")

    def test_AT_mismatch(self):
        """
        The Ancestor's Tale tree (different colours) should show mismatch
        """
        self.test_mismatch("AT")

    def test_trail2016_mismatch(self):
        """
        The Ancestor's Trail tree (different sponsorship details) should show mismatch
        """
        self.test_mismatch("trail2016")

    def test_linnean_mismatch(self):
        """
        The Linnean Soc tree (different sponsorship details) should show mismatch
        """
        self.test_mismatch("linnean")

    def test_text_tree_mismatch(self):
        """
        The text-only tree (e.g. for humans=ott 770315) should still work, as it does not require files to match the db version
        """
        self.browser.get(base_url + "life_text/@={}".format(self.humanOTT))
        assert self.element_by_class_exists('text_tree'), "Should have the text tree in a labelled div"
        assert self.element_by_class_exists('species'), "Should have the species in a labelled div"

    def test_text_tree_root_absent(self):
        """
        The text-only tree should be missing the root node, which has been changed from 0 to the proper version number
        """
        self.browser.get(base_url + "life_text")
        assert self.element_by_class_exists('text_tree'), "Should have the text tree in a labelled div"
        assert not self.element_by_class_exists('text_tree_root'), "Should not have the root of the text tree"

    def test_minlife_available(self):
        """
        The minlife view for restricted installation should show mismatch error
        """
        self.test_mismatch("treeviewer/minlife")

    def test_minlife_static(self):
        """
        The temporary minlife file in static should show a mismatch error
        """
        self.test_mismatch(self.temp_minlife, "file://")

