#set stupid mysql to use full 4 byte unicode (https://mathiasbynens.be/notes/mysql-utf8mb4)

drop procedure if exists MakeFullUnicode;

DELIMITER //

CREATE PROCEDURE MakeFullUnicode(tablename CHAR(50), columnname CHAR(50))

  BEGIN
    DECLARE char_set TEXT;
    DECLARE vtype TEXT;
    
    SELECT character_set_name, column_type INTO char_set, vtype FROM information_schema.`COLUMNS` 
        WHERE table_schema = SCHEMA() AND table_name = tablename AND column_name = columnname;
    IF char_set != 'utf8mb4' THEN 
      SET @sql_cmd = CONCAT('ALTER TABLE ', tablename,' CONVERT TO CHARACTER SET utf8mb4;');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('ALTER TABLE ', tablename,' CHANGE ', columnname, ' ', columnname, ' ', vtype, ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('REPAIR TABLE ', tablename, ';');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
      SET @sql_cmd = CONCAT('OPTIMIZE TABLE ', tablename, ';');
      PREPARE stmt FROM @sql_cmd;
      EXECUTE stmt;
    END IF;
  END //

DELIMITER ;

#with an innoDB server, you may get ignorable errors like 'The storage engine for the table doesn't support repair'
call MakeFullUnicode('vernacular_by_ott', 'vernacular');
call MakeFullUnicode('vernacular_by_name', 'vernacular');
call MakeFullUnicode('images_by_ott', 'rights');
call MakeFullUnicode('images_by_ott', 'licence');
call MakeFullUnicode('images_by_name', 'rights');
call MakeFullUnicode('images_by_name', 'licence');
call MakeFullUnicode('search_log', 'search_string');

# note make sure that the name column in vernacular_by_name and the name column in ordered_leaves and ordered_nodes are of the same character set otherwise search can get incredibly slow even with indexes.

DROP   INDEX news_date_index     ON news;
CREATE INDEX news_date_index     ON news (news_date);

DROP   INDEX ott_index           ON banned;
CREATE INDEX ott_index           ON banned (ott)                      USING HASH;

DROP   INDEX ott_index           ON iucn;
CREATE INDEX ott_index           ON iucn (ott)                        USING HASH;

DROP   INDEX iucn_index          ON iucn;
CREATE INDEX iucn_index          ON iucn (status_code)                USING HASH;

DROP   INDEX ott_index           ON images_by_ott;
CREATE INDEX ott_index           ON images_by_ott (ott, best_any)     USING HASH;

DROP   INDEX overall_any_index   ON images_by_ott;
CREATE INDEX overall_any_index   ON images_by_ott (overall_best_any)  USING HASH;

DROP   INDEX name_index          ON images_by_name;
CREATE INDEX name_index          ON images_by_name (name, best_any)   USING HASH;

DROP   INDEX overall_any_index   ON images_by_name;
CREATE INDEX overall_any_index   ON images_by_name (overall_best_any) USING HASH;

DROP   INDEX src_index           ON images_by_ott;
CREATE INDEX src_index           ON images_by_ott (src, src_id);

DROP   INDEX src_index           ON images_by_name;
CREATE INDEX src_index           ON images_by_name (src, src_id);

DROP   INDEX rating_index        ON images_by_ott;
CREATE INDEX rating_index        ON images_by_ott(rating);

DROP   INDEX rating_index        ON images_by_name;
CREATE INDEX rating_index        ON images_by_name(rating);

DROP   INDEX ott_index           ON vernacular_by_ott;
CREATE INDEX ott_index           ON vernacular_by_ott (ott, lang_primary, preferred, src) USING HASH;

DROP   INDEX name_index          ON vernacular_by_name;
CREATE INDEX name_index          ON vernacular_by_name (name, lang_primary, preferred, src);

DROP   INDEX ott_index           ON reservations;
CREATE INDEX ott_index           ON reservations (OTT_ID)           USING HASH;

DROP   INDEX user_kind_index     ON reservations;
CREATE INDEX user_kind_index     ON reservations (user_sponsor_kind) USING HASH;

DROP   INDEX verified_index      ON reservations;
CREATE INDEX verified_index      ON reservations (verified_kind)    USING HASH;

DROP   INDEX verifiedtime_index  ON reservations;
CREATE INDEX verifiedtime_index  ON reservations (verified_time);

DROP   INDEX user_time_index     ON reservations;
CREATE INDEX user_time_index     ON reservations (user_updated_time);

DROP   INDEX PP_e_mail_index     ON reservations;
CREATE INDEX PP_e_mail_index     ON reservations (PP_e_mail)        USING HASH;

DROP   INDEX e_mail_index        ON reservations;
CREATE INDEX e_mail_index        ON reservations (e_mail)        USING HASH;

DROP   INDEX donor_name_index    ON reservations;
CREATE INDEX donor_name_index    ON reservations (verified_donor_name) USING HASH;

DROP   INDEX eol_index           ON eol_updated;
CREATE INDEX eol_index           ON eol_updated (eol)               USING HASH;

DROP   INDEX updated_index       ON eol_updated;
CREATE INDEX updated_index       ON eol_updated (updated);

DROP   INDEX ott_index           ON visit_count;
CREATE INDEX ott_index           ON visit_count (ott)               USING HASH;

DROP   INDEX lang_primary_index  ON vernacular_by_name;
CREATE INDEX lang_primary_index  ON vernacular_by_name (lang_primary);

DROP   INDEX lang_full_index     ON vernacular_by_name;
CREATE INDEX lang_full_index     ON vernacular_by_name (lang_full);

DROP   INDEX lang_primary_index  ON vernacular_by_ott;
CREATE INDEX lang_primary_index  ON vernacular_by_ott (lang_primary);

DROP   INDEX lang_full_index     ON vernacular_by_ott;
CREATE INDEX lang_full_index     ON vernacular_by_ott (lang_full);

DROP   INDEX preferred_index     ON vernacular_by_name;
CREATE INDEX preferred_index     ON vernacular_by_name (preferred);

DROP   INDEX preferred_index     ON vernacular_by_ott;
CREATE INDEX preferred_index     ON vernacular_by_ott (preferred);

DROP            INDEX vernacular_index       ON vernacular_by_name;
CREATE          INDEX vernacular_index       ON vernacular_by_name (vernacular);

DROP            INDEX vernacular_index       ON vernacular_by_ott;
CREATE          INDEX vernacular_index       ON vernacular_by_ott (vernacular);

DROP            INDEX ft_vernacular_index    ON vernacular_by_name;
CREATE FULLTEXT INDEX ft_vernacular_index    ON vernacular_by_name (vernacular);

DROP            INDEX ft_vernacular_index    ON vernacular_by_ott;
CREATE FULLTEXT INDEX ft_vernacular_index    ON vernacular_by_ott (vernacular);

# some indexes for sponsor searching

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (verified_name);

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (verified_donor_name);

DROP            INDEX sponsor_info_index     ON reservations;
CREATE          INDEX sponsor_info_index     ON reservations (verified_more_info);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (verified_name);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (verified_donor_name);

DROP            INDEX ft_sponsor_info_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_info_index  ON reservations (verified_more_info);

DROP            INDEX sponsor_name_index     ON reservations;
CREATE          INDEX sponsor_name_index     ON reservations (user_sponsor_name);

DROP            INDEX sponsor_info_index     ON reservations;
CREATE          INDEX sponsor_info_index     ON reservations (user_more_info);

DROP            INDEX ft_sponsor_name_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_name_index  ON reservations (user_sponsor_name);

DROP            INDEX ft_sponsor_info_index  ON reservations;
CREATE FULLTEXT INDEX ft_sponsor_info_index  ON reservations (user_more_info);

DROP   INDEX ipni_index          ON PoWO;
CREATE INDEX ipni_index          ON PoWO (ipni_int)         USING HASH;

DROP   INDEX string_index    ON search_log;
CREATE INDEX string_index    ON search_log (search_string)   USING HASH;

DROP   INDEX identifier_index    ON partners;
CREATE INDEX identifier_index    ON partners (partner_identifier)   USING HASH;

DROP   INDEX key_index           ON API_users;
CREATE INDEX key_index           ON API_users (APIkey)     USING HASH;

DROP   INDEX key_index           ON API_use;
CREATE INDEX key_index           ON API_use (APIkey)       USING HASH;

DROP   INDEX API_index           ON API_use;
CREATE INDEX API_index           ON API_use (API)          USING HASH;

DROP   INDEX date_index          ON API_use;
CREATE INDEX date_index          ON API_use (end_date)     USING HASH;

DROP   INDEX category_index      ON tree_startpoints;
CREATE INDEX category_index      ON tree_startpoints (category);

DROP   INDEX pi_index            ON tree_startpoints;
CREATE INDEX pi_index            ON tree_startpoints (partner_identifier);

# The following are the indexes for ordered leaves & ordered nodes, useful to re-do after a new tree is imported 

DROP   INDEX price_index         ON ordered_leaves;
CREATE INDEX price_index         ON ordered_leaves (price);

DROP   INDEX ipni_index          ON ordered_nodes;
CREATE INDEX ipni_index          ON ordered_nodes (ipni)    USING HASH;

DROP   INDEX ipni_index          ON ordered_leaves;
CREATE INDEX ipni_index          ON ordered_leaves (ipni)   USING HASH;

DROP   INDEX ott_index           ON ordered_nodes;
CREATE INDEX ott_index           ON ordered_nodes (ott)     USING HASH;

DROP   INDEX ott_index           ON ordered_leaves;
CREATE INDEX ott_index           ON ordered_leaves (ott)    USING HASH;

DROP   INDEX eol_index           ON ordered_nodes;
CREATE INDEX eol_index           ON ordered_nodes (eol)     USING HASH;

DROP   INDEX eol_index           ON ordered_leaves;
CREATE INDEX eol_index           ON ordered_leaves (eol)    USING HASH;

DROP   INDEX wiki_index          ON ordered_nodes;
CREATE INDEX wiki_index          ON ordered_nodes (wikidata)  USING HASH;

DROP   INDEX wiki_index          ON ordered_leaves;
CREATE INDEX wiki_index          ON ordered_leaves (wikidata) USING HASH;

DROP   INDEX parent_index        ON ordered_nodes;
CREATE INDEX parent_index        ON ordered_nodes (parent)  USING HASH;

DROP   INDEX parent_index        ON ordered_leaves;
CREATE INDEX parent_index        ON ordered_leaves (parent) USING HASH;

DROP   INDEX real_parent_index   ON ordered_nodes;
CREATE INDEX real_parent_index   ON ordered_nodes (real_parent)  USING HASH;

DROP   INDEX real_parent_index   ON ordered_leaves;
CREATE INDEX real_parent_index   ON ordered_leaves (real_parent) USING HASH;

DROP   INDEX raw_pop_index       ON ordered_nodes;
CREATE INDEX raw_pop_index       ON ordered_nodes (raw_popularity);

DROP   INDEX raw_pop_index       ON ordered_leaves;
CREATE INDEX raw_pop_index       ON ordered_leaves (raw_popularity);

DROP   INDEX pop_index           ON ordered_nodes;
CREATE INDEX pop_index           ON ordered_nodes (popularity);

DROP   INDEX pop_index           ON ordered_leaves;
CREATE INDEX pop_index           ON ordered_leaves (popularity);

DROP   INDEX poprank_index       ON ordered_leaves;
CREATE INDEX poprank_index       ON ordered_leaves (popularity_rank);

DROP   INDEX name_index          ON ordered_leaves;
CREATE INDEX name_index          ON ordered_leaves (name);

DROP   INDEX name_index          ON ordered_nodes;
CREATE INDEX name_index          ON ordered_nodes (name);

DROP            INDEX name_fulltext_index ON ordered_nodes;
CREATE FULLTEXT INDEX name_fulltext_index ON ordered_nodes (name);

DROP            INDEX name_fulltext_index ON ordered_leaves;
CREATE FULLTEXT INDEX name_fulltext_index ON ordered_leaves (name);
