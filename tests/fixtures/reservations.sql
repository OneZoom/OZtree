BEGIN;

CREATE TABLE IF NOT EXISTS reservations_fixturebackup LIKE reservations;
INSERT reservations_fixturebackup SELECT * FROM reservations WHERE e_mail NOT LIKE 'fixture%@example.com';
DELETE FROM reservations;

CREATE TABLE IF NOT EXISTS expired_reservations_fixturebackup LIKE expired_reservations;
INSERT expired_reservations_fixturebackup SELECT * FROM expired_reservations WHERE e_mail NOT LIKE 'fixture%@example.com';
DELETE FROM expired_reservations;

INSERT INTO reservations
        (e_mail,                           OTT_ID, verified_time,            sponsorship_ends,         user_giftaid, user_paid, user_donor_show, name, verified_kind, verified_name, verified_more_info)
 VALUES ('fixture_single@example.com',     714464, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  TRUE,         134400,    TRUE,            'Anseranas semipalmata', 'By', 'Fixture Single', NULL)
      , ('fixture_bannedott@example.com',  872573, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        155400,    TRUE,            'Ailuropoda melanoleuca', 'By', 'Fixture BannedOTT', NULL)
      , ('fixture_bannedott@example.com',  872577, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        443400,    TRUE,            'Ursus americanus', 'By', 'Fixture BannedOTT', NULL)
      , ('fixture_agemixture@example.com', 767829, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 MONTH, TRUE,         534400,    TRUE,            'Anhima cornuta', 'By', 'Fixture Agemixture', 'Some more info I entered')
      , ('fixture_agemixture@example.com', 860132, NOW() - INTERVAL 2 MONTH, NOW() + INTERVAL 2 MONTH, TRUE,         323400,    FALSE,           'Chauna torquata', 'By', 'Fixture Agemixture', 'I like it')
      , ('fixture_agemixture@example.com', 241848, NOW() - INTERVAL 1 MONTH, NOW() + INTERVAL 3 MONTH, TRUE,         999400,    TRUE,            'Chauna chavaria', 'For', 'Mr. Agemixture', NULL)
      ;

INSERT INTO expired_reservations
        (e_mail,                           OTT_ID, verified_time,            sponsorship_ends,         was_renewed, user_giftaid, user_donor_show, name, verified_kind, verified_name, verified_more_info)
 VALUES ('fixture_agemixture@example.com', 714464, NOW() - INTERVAL 8 MONTH, NOW() - INTERVAL 1 MONTH, FALSE,       TRUE,         TRUE,            'Anseranas semipalmata', 'By', 'Fixture Agemixture', NULL)
      , ('fixture_agemixture@example.com', 539138, NOW() - INTERVAL 9 MONTH, NOW() - INTERVAL 2 MONTH, FALSE,       TRUE,         TRUE,            'Thalassornis leuconotus', 'By', 'Fixture Agemixture', NULL)
      , ('fixture_agemixture@example.com', 767829, NOW() - INTERVAL 12 MONTH,NOW() - INTERVAL 8 MONTH, TRUE,        TRUE,         TRUE,            'Anhima cornuta', 'By', 'Fixture Agemixture', 'An old reservation')
      ;

COMMIT;