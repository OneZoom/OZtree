# -*- coding: utf-8 -*-
"""
"""
import os.path
from time import sleep
from nose import tools

from ...util import base_url
from ..functional_tests import FunctionalTest

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

oz_imageinfo_pagetitle = "OneZoom: Picture information"

class title_contains(object):
  """An expectation for checking that a title contains some text.

  locator - used to find the element
  returns the text once it has the particular css class
  """
  def __init__(self, text):
    self.text = text

  def __call__(self, driver):
    text = driver.find_element_by_tag_name("title").get_attribute("innerHTML")   # Finding the referenced element
    if self.text in text:
        return text
    else:
        return False

class TestImageInfo(FunctionalTest):
    """
    Test whether the image information pages work
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        super().setUpClass()
        self.image_data_dict = {}
        db_cursor = self.db['connection'].cursor()
        db_cursor.execute("SELECT src, src_id FROM images_by_ott WHERE src=1 AND src_id < 0 AND url LIKE 'https://commons.wikimedia.org/%' LIMIT 1") # a non-eol URL
        row = db_cursor.fetchone()
        self.image_data_dict['wiki']=dict(src=row[0], src_id=row[1])
        db_cursor.execute("SELECT src, src_id FROM images_by_ott WHERE src=1 AND src_id < 0 AND url NOT LIKE '%//%' LIMIT 1") #not a url
        row = db_cursor.fetchone()
        self.image_data_dict['plain']=dict(src=row[0], src_id=row[1])
        db_cursor.execute("SELECT src, src_id FROM images_by_ott WHERE src=1 AND src_id > 0 LIMIT 1") #bespoke OZ image from EoL
        row = db_cursor.fetchone()
        self.image_data_dict['oz']=dict(src=row[0], src_id=row[1])
        db_cursor.execute("SELECT src, src_id FROM images_by_ott WHERE src=2 AND src_id > 0 LIMIT 1") #standard EoL image
        row = db_cursor.fetchone()
        self.image_data_dict['eol']=dict(src=row[0], src_id=row[1])
        self.db['connection'].commit()
        db_cursor.close()


    @tools.nottest
    def test_image_iframe(self, image_data, expected_iframe_title_contains, extra_iframe_checks=None):
        """
        Check that we can get a OneZoom page showing information about a held image
        """
        self.browser.execute_script("UI_callbacks.closeAll(); UI_callbacks.openCopyright({},{})".format(image_data['src'],image_data['src_id']))
        #check that the standard browser produces the correct iframe
        sleep(1) #wait for redirects
        iframe_css = "#imageinfo-modal iframe"
        iframe = self.browser.find_element_by_css_selector(iframe_css)
        self.browser.switch_to.frame(iframe)
        #here we should use self.browser.current_url but there seems to be a bug whereby it always returns the top url, so we look in title instead
        actual_title = self.browser.find_element_by_tag_name("title").get_attribute("innerHTML")
        try:
            WebDriverWait(self.browser, 5).until(title_contains(expected_iframe_title_contains))
        except TimeoutException:
            assert False, "<title> attribute in the iframe '{}' should contain '{}', but is '{}'".format(
                iframe_css, expected_iframe_title_contains, actual_title)
        #if this is a OneZoom iframe, check that the link out is correct
        if extra_iframe_checks:
            extra_iframe_checks(self) #this should happen with in the iframe
        self.browser.switch_to_default_content()

    @tools.nottest
    def test_normal_images(self, image_data, linkout_url_contains, expected_iframe_title_contains, extra_iframe_checks=None):
        """
        Check that we can get a OneZoom page showing information about a held image, and there is a link out button
        """
        self.browser.get(base_url + 'life')
        self.test_image_iframe(image_data, expected_iframe_title_contains, extra_iframe_checks)
        assert len(self.browser.window_handles) == 1, "Should be only one window/tab open"
        main_oz_tab = self.browser.window_handles[0]
        #follow the link out (should open in new tab)
        try:
            elem = WebDriverWait(self.browser, 5).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#imageinfo-modal a")))
            elem.click()
            assert len(self.browser.window_handles) == 2, "Should have opened another tab"
            new_tab = [x for x in self.browser.window_handles if x != main_oz_tab][0]
            self.browser.switch_to.window(new_tab)
            assert linkout_url_contains in self.browser.current_url, "Should have opened the correct url (containing '{}')".format(linkout_url_contains)
            self.browser.close()
        except TimeoutException:
            assert False, 'There should be a button to link out when using image info {}'.format(image_data)
        self.browser.switch_to.window(main_oz_tab)
        
    @tools.nottest
    def test_md_images(self, image_data):
        def extra_iframe_checks(self):
            assert not self.element_by_tag_name_exists("a"), 'Should not have any link outs'
        self.browser.get(base_url + 'life_MD')
        self.test_image_iframe(image_data, oz_imageinfo_pagetitle, extra_iframe_checks)
       
    def test_plain_images(self):
        """
        Test that a bespoke image inserted by hand with no URL pops up correctly in the normal viewer 
        """
        def extra_iframe_checks(self):
            assert not self.element_by_css_selector_exists("#imageinfo a.provenance-url"), 'Should not have a link out from a plain image with no url'
        self.test_normal_images(self.image_data_dict['plain'], base_url, oz_imageinfo_pagetitle, extra_iframe_checks)
        
    def test_wiki_images(self):
        """
        Test that a bespoke image inserted by hand from wikipedia pops up correctly in the normal viewer 
        """
        def extra_iframe_checks(self):
            link_out = self.browser.find_element_by_css_selector("#imageinfo a.provenance-url")
            assert link_out, 'There should be a link to the wikipedia page'
            link_out.click()
            sleep(1)
            assert 'Wikimedia Commons' in self.browser.find_element_by_tag_name("title").get_attribute("innerHTML"), 'Link shoudl navigate iframe to wikimedia commons'
        self.browser.get(base_url + 'life')
        self.test_normal_images(self.image_data_dict['wiki'], base_url, oz_imageinfo_pagetitle, extra_iframe_checks)
        
    def test_oz_images(self):
        """
        Test that a bespoke OZ image from EoL pops up the EoL site in the normal viewer 
        """
        self.browser.get(base_url + 'life')
        self.test_normal_images(self.image_data_dict['oz'], '//eol.org/', "Encyclopedia of Life")
        
    def test_eol_images(self):
        """
        Test that an normal image taken from EoL pops up the EoL site in the normal viewer 
        """
        self.browser.get(base_url + 'life')
        self.test_normal_images(self.image_data_dict['eol'], '//eol.org/', "Encyclopedia of Life")
        
    def test_plain_MD_images(self):
        """
        Test that a bespoke image inserted by hand with no URL pops up the OZ page in the museum display viewer 
        """
        self.test_md_images(self.image_data_dict['plain'], )
        
    def test_wiki_MD_images(self):
        """
        Test that a bespoke image inserted by hand from wikipedia pops up the OZ page in the museum display viewer 
        """
        self.test_md_images(self.image_data_dict['wiki'])
        
    def test_oz_MD_images(self):
        """
        Test that a bespoke OZ image from EoL pops up the OZ page in the museum display viewer 
        """
        self.test_md_images(self.image_data_dict['oz'])
        
    def test_eol_MD_images(self):
        """
        Test that an normal image taken from EoL pops up the OZ page in the museum display viewer 
        """
        self.test_md_images(self.image_data_dict['eol'])
