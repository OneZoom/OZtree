# -*- coding: utf-8 -*-
"""

"""
import sys
import os.path
from time import sleep

from ...util import base_url, web2py_app_dir
from ..functional_tests import FunctionalTest, linkouts_json

from selenium.common.exceptions import WebDriverException

class TestLinksAndInfoboxes(FunctionalTest):
    """
    Test the popup boxes such as 'how to use', 'data sources', etc.
    Especially check that the links within them are valid, with no 404s
    (It is easy to get these wrong). Also test other links
    """
    @classmethod
    def setUpClass(self):
        print("== Running {} ==".format(os.path.basename(__file__)))
        #we need to find "true" links, e.g. not links acting as buttons (which have hrefs starting with #, so are "page-internal")
        #have to search by xpath as searching by css in selenium expands the href to include the hostname
        self.xpath_link_not_page_internal = "//a[@href and not(starts-with(@href, '#'))]" #an anchor with an href that does not start with '#' 
        super().setUpClass()

    def test_MD_nolinks(self):
        """
        There should be no links in the museum display, even from modals loaded in to the page
        """
        self.browser.get(base_url + 'life_MD')
        bad_links = self.browser.find_elements_by_xpath(self.xpath_link_not_page_internal)
        assert len(bad_links) == 0, "The standard page should not have any non-page-internal links"
        for elem in self.browser.find_elements_by_css_selector("[uk-modal]"):
            #only get the ones with an id
            id = elem.get_attribute("id")
            if id:
                self.browser.execute_script("UIkit.modal('#{}').show();".format(id))
                bad_links = self.browser.find_elements_by_xpath(self.xpath_link_not_page_internal)
                assert len(bad_links) == 0, \
                    "Model {} has the following link in the museum display: {}".format(id, " ".join(["{}".format(x.get_attribute("href")) for x in bad_links]))

    def best_tabbed_links(self):
        """
        Links from standard modals should all create new tabs/windows
        """
        #go tto human OTT which has a smaller set of background links
        self.browser.get(base_url + 'life/@={}?init=nozoom'.format(self.humanOTT))
        assert len(self.browser.window_handles) == 1, "Should start with a single window"
        main_oz_tab = self.browser.window_handles[0]
        #even in museum display we allow e.g. buttons with links as long as they are page-internal (start with #)
        #have to search by xpath as searching by css in selenium expands the href to include the hostname
        for link in self.browser.find_elements_by_xpath(self.xpath_link_not_page_internal):
            if link.get_attribute('id') != 'OZ-logo' and link.is_enabled(): #only visible links
                try:
                    html = link.get_attribute('outerHTML')
                    link.click()
                    assert len(self.browser.window_handles) == 2, "Link '{}' () should open a new window".format(html)
                    new_tab = [x for x in self.browser.window_handles if x != main_oz_tab][0]
                    self.browser.switch_to.window(new_tab)
                    self.browser.close()
                    assert len(self.browser.window_handles) == 1
                except WebDriverException as e:
                    if any([allowed in str(e) for allowed in ('is not clickable', 'element not visible')]):
                        pass
                    else:
                        raise WebDriverException("Error with {}: ".format(html) + str(e))
                
        xpath_link_not_page_internal = "//a[@href and not(starts-with(@href, '#'))]" #an anchor with an href that does not start with '#' 
        for elem in self.browser.find_elements_by_css_selector("[uk-modal]"):
            #only get the ones with an id
            id = elem.get_attribute("id")
            if id:
                self.browser.execute_script("UIkit.modal('#{}').show();".format(id))
                for links in self.browser.find_elements_by_xpath(self.xpath_link_not_page_internal):
                    if link.get_attribute('id') != 'OZ-logo' and link.is_enabled():
                        try:
                            html = link.get_attribute('outerHTML')
                            link.click()
                            sleep(0.5)
                            n_windows = len(self.browser.window_handles)
                            assert n_windows == 2, "Link to {} should create new window/tab, but there are now {} windows".format(html, n_windows)
                            new_tab = [x for x in self.browser.window_handles if x != main_oz_tab][0]
                            self.browser.switch_to.window(new_tab)
                            self.browser.close()
                            assert len(self.browser.window_handles) == 1
                        except WebDriverException as e:
                            if any([allowed in str(e) for allowed in ('is not clickable', 'element not visible')]):
                                pass
                            else:
                                raise WebDriverException("Error with {}: ".format(html) + str(e))
                        self.browser.switch_to.window(main_oz_tab)


    def test_logo_link(self):
        """
        The OneZoom logo should always link to the homepage and not in a new tab
        """
        self.browser.get(base_url + 'life_MD')
        logo = self.browser.find_elements_by_css_selector('.logo')
        assert len(logo)==1, "plain MD should always have a single logo, but have found {}".format(len(logo))
        links = logo[0].find_elements_by_css_selector("a#OZ-logo")
        assert len(links)==0, "Museum display should not have links from the OneZoom logo"

        self.browser.get(base_url + 'life')
        assert len(self.browser.window_handles) == 1, "Should start with a single window"
        logo = self.browser.find_elements_by_css_selector('.logo')
        assert len(logo)==1, "There should always be a single OneZoom logo, but have found {}".format(len(logo))
        links = logo[0].find_elements_by_css_selector("a#OZ-logo")
        assert len(links)==1, "There should always be a single link from the OneZoom logo"
        links[0].click()
        assert len(self.browser.window_handles) == 1, "Should not have opened another tab"
        

    def test_modals_have_text(self):
        """
        All modals should contain some information (and not an error)
        """
        pass

