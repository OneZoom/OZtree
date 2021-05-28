BEGIN;

CREATE TABLE IF NOT EXISTS reservations_fixturebackup LIKE reservations;
INSERT reservations_fixturebackup SELECT * FROM reservations WHERE e_mail NOT LIKE 'fixture%@example.com';
DELETE FROM reservations;

CREATE TABLE IF NOT EXISTS expired_reservations_fixturebackup LIKE expired_reservations;
INSERT expired_reservations_fixturebackup SELECT * FROM expired_reservations WHERE e_mail NOT LIKE 'fixture%@example.com';
DELETE FROM expired_reservations;

INSERT INTO reservations
        (e_mail,                           OTT_ID, verified_time,            sponsorship_ends,         user_giftaid, user_sponsor_name, user_paid, user_donor_show, PP_transaction_code, name, verified_kind, verified_name, verified_more_info)
 VALUES ('fixture_single@example.com',     714464, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  TRUE,         'Mr. F. Single',   1344.00,    TRUE,           'FAKEPP1234',        'Anseranas semipalmata', 'By', 'Fixture Single', NULL)
      , ('fixture_bannedott@example.com',  872573, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        'Ms. F. Banned',   1554.00,    TRUE,           'FAKEPP1244',        'Ailuropoda melanoleuca', 'By', 'Fixture BannedOTT', NULL)
      , ('fixture_bannedott@example.com',  872577, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        'Ms. F. Banned',   4434.00,    TRUE,           'FAKEPP1254',        'Ursus americanus', 'By', 'Fixture BannedOTT', NULL)
      , ('fixture_agemixture@example.com', 767829, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 MONTH, TRUE,         'Dr. F. Agemix',   5344.00,    TRUE,           'FAKEPP1264',        'Anhima cornuta', 'By', 'Fixture Agemixture', 'Some more info I entered')
      , ('fixture_agemixture@example.com', 860132, NOW() - INTERVAL 2 MONTH, NOW() + INTERVAL 2 MONTH, TRUE,         'Dr. F. Agemix',   3234.00,    FALSE,          'FAKEPP1274',        'Chauna torquata', 'By', 'Fixture Agemixture', 'I like it')
      , ('fixture_agemixture@example.com', 241848, NOW() - INTERVAL 1 MONTH, NOW() + INTERVAL 3 MONTH, TRUE,         'Dr. F. Agemix',   9994.00,    TRUE,           'FAKEPP1284',        'Chauna chavaria', 'For', 'Mr. Agemixture', NULL)
      ;

INSERT INTO expired_reservations
        (e_mail,                           OTT_ID, verified_time,            sponsorship_ends,         was_renewed, user_sponsor_name, user_giftaid, user_donor_show, PP_transaction_code, name, verified_kind, verified_name, verified_more_info)
 VALUES ('fixture_agemixture@example.com', 714464, NOW() - INTERVAL 8 MONTH, NOW() - INTERVAL 1 MONTH, FALSE,       'Dr. F. Agemix',   TRUE,         TRUE,            'FAKEPP1001',        'Anseranas semipalmata', 'By', 'Fixture Agemixture', NULL)
      , ('fixture_agemixture@example.com', 539138, NOW() - INTERVAL 9 MONTH, NOW() - INTERVAL 2 MONTH, FALSE,       'Dr. F. Agemix',   TRUE,         TRUE,            'FAKEPP1002',        'Thalassornis leuconotus', 'By', 'Fixture Agemixture', NULL)
      , ('fixture_agemixture@example.com', 767829, NOW() - INTERVAL 12 MONTH,NOW() - INTERVAL 8 MONTH, TRUE,        'Dr. F. Agemix',   TRUE,         TRUE,            'FAKEPP1003',        'Anhima cornuta', 'By', 'Fixture Agemixture', 'An old reservation')
      , ('fixture_agemixture@example.com', 767829, NOW() - INTERVAL 24 MONTH,NOW() - INTERVAL 12 MONTH,TRUE,        'Dr. F. Agemix',   TRUE,         TRUE,            'FAKEPP1003',        'Anhima cornuta', 'By', 'Fixture Agemixture', 'An old reservation')
      ;

COMMIT;
