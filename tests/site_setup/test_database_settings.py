#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import re

import pymysql

if sys.version_info[0] < 3:
    raise Exception("Python 3 only")

from ..util import get_db_connection

class TestDatabaseSettings(object):
    @classmethod
    def setup_class(self):
        self.db = get_db_connection()

    @classmethod    
    def teardown_class(self):
        pass
    
    def test_indexes_created(self):
        """Check that there are at a minimum indexes on ordered_nodes.ott, ordered_leaves.ott, & vernacular_by_ott.vernacular, etc."""
        with self.db['connection'].cursor(pymysql.cursors.DictCursor) as db_cursor:
            db_cursor.execute("SHOW INDEXES FROM ordered_nodes")
            indexes = db_cursor.fetchall()
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            assert len(indexes) > 5, "There should be a number of indexes in ordered_nodes"
    
            db_cursor.execute("SHOW INDEXES FROM ordered_leaves")
            indexes = db_cursor.fetchall()
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            assert len(indexes) > 5, "There should be a number of indexes in ordered_leaves"
    
            db_cursor.execute("SHOW INDEXES FROM vernacular_by_ott")
            indexes = db_cursor.fetchall()
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            assert any(r['Index_type']=='FULLTEXT' for r in indexes), "There should be a number of indexes in ordered_nodes"

    def test_picures_percolated(self):
        """Check that we have node images (i.e that OZprivate/ServerScripts/Utilities/picProcess.py has been run)"""
        with self.db['connection'].cursor() as db_cursor:
            db_cursor.execute("SELECT rep1 FROM ordered_nodes where real_parent = 0")
            best_life_picture = db_cursor.fetchone()[0]
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            assert best_life_picture is not None, "There is no node picture for all life: picProcess.py has probably not been run"
        
    
    def test_fulltext_index_settings(self):
        """Check that we have the right minimum word size for fulltext indexes"""
        with self.db['connection'].cursor() as db_cursor:
            db_cursor.execute("SELECT @@GLOBAL.innodb_ft_min_token_size")
            innodb_ft_min_token_size = db_cursor.fetchone()[0]
            self.db['connection'].commit() #need to commit here otherwise next select returns stale data
            assert innodb_ft_min_token_size <= 3, "innodb_ft_min_token_size should be 3 characters max for decent search results"
        
        
    def test_full_unicode_for_vernaculars(self):
        """Vernacular names (which include chinese etc) should be full 4 byte unicode"""
        check_table_colname = { #the list of table:colname to check for identity
            'vernacular_by_ott': 'vernacular', 
            'vernacular_by_name':'vernacular',
            }
        name_info = {}
        
        with self.db['connection'].cursor() as db_cursor:
            for table, colname in check_table_colname.items():
                db_cursor.execute("SELECT character_set_name FROM information_schema.`COLUMNS` WHERE table_schema = SCHEMA() AND table_name = '{}' AND column_name = '{}';".format(table, colname))
                name_info[table+"-"+colname] = db_cursor.fetchone()
                self.db['connection'].commit() #need to commit here otherwise next select returns stale data
        for k,v in name_info.items():
            assert v[0] == "utf8mb4", "vernacular columns should be full 4 byte unicode"       
    
    def test_name_indexes_use_same_charset(self):
        """
        Check the 'name' columns in e.g. vernacular_by_name & ordered_leaves have identical charsets
        Since these are used as unique matching keys, having different charsets can drastically slow down search,
        which has caused problems in the past
        """
        
        check_table_colname = { #the list of table:colname to check for identity
            'ordered_leaves': 'name', 
            'ordered_nodes': 'name',
            'vernacular_by_name':'name',
            'images_by_name':'name',
            }
        name_info = {}
        
        with self.db['connection'].cursor() as db_cursor:
            for table, colname in check_table_colname.items():
                db_cursor.execute("SELECT character_set_name, column_type FROM information_schema.`COLUMNS` WHERE table_schema = SCHEMA() AND table_name = '{}' AND column_name = '{}';".format(table, colname))
                name_info[table+"-"+colname] = db_cursor.fetchone()
                self.db['connection'].commit() #need to commit here otherwise next select returns stale data

        for k,v in name_info.items():
            m = re.match(r'varchar\((\d+)\)', v[1])
            assert m, "Table-column {} must be of type varchar, but is {}".format(k, v[1])
            assert int(m.group(1)) < 200, "Table-column {} is of length {} but should be less than {} ({}), to allow mb4 indexing (see {})".format(
                k, 767/4, "767/4", v[1], "https://dev.mysql.com/doc/refman/5.7/en/innodb-restrictions.html")
                
                
        test_charset = None
        ni = None
        for k,v in name_info.items():
            if test_charset is None or ni is None:
                test_charset = v[0]
                ni = k
            else:
                assert v[0] == test_charset, "Table-column {} (charset '{}') is different to {} (charset '{}')".format(
                    k, v[0], ni, test_charset)

    def test_range_optimizer_max_mem_size(self):
        """Test that if we are using a mysql version > 5.7.9, the range_optimizer_max_mem_size is set to at least the default in 5.7.12
        In versions from 5.7.9 - 5.7.11 it took a value of 1536000 which meant multiple warnings of the form:
        'Memory capacity of 1536000 bytes for 'range_optimizer_max_mem_size' exceeded. Range optimization was not done for this query.''"""
        min_range_optimizer_max_mem_size = 8388608 #see https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html#sysvar_range_optimizer_max_mem_size
        with self.db['connection'].cursor() as db_cursor:
            db_cursor.execute("SELECT @@GLOBAL.range_optimizer_max_mem_size")
            range_optimizer_max_mem_size = db_cursor.fetchone()
            if range_optimizer_max_mem_size:
                assert range_optimizer_max_mem_size[0] >= min_range_optimizer_max_mem_size, \
                    "range_optimizer_max_mem_size is {} which is less than {}. Please set it to at least this value in my.cnf, or upgrade to mysql > 5.7.11".format(
                    range_optimizer_max_mem_size[0], min_range_optimizer_max_mem_size)
