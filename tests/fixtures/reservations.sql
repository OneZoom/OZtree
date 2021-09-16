BEGIN;

-- Older fixtures had entries of this form, can be removed in future
DELETE FROM reservations WHERE e_mail LIKE 'fixture%@example.com';
DELETE FROM expired_reservations WHERE e_mail LIKE 'fixture%@example.com';

DELETE FROM reservations WHERE e_mail LIKE '%@fixture.example.com';
DELETE FROM expired_reservations WHERE e_mail LIKE '%@fixture.example.com';

INSERT INTO reservations
        (e_mail,                           username,        OTT_ID, verified_time,            sponsorship_ends,         user_giftaid, user_sponsor_name, user_paid, user_donor_hide, PP_transaction_code, name, verified_kind, verified_name, verified_more_info, sponsorship_story)
 VALUES ('single@fixture.example.com',     'fx_single',     714464, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  TRUE,         'Mr. F. Single',   1344.00,    FALSE,          'FAKEPP1234',        'Anseranas semipalmata', 'by', 'Fixture Single', NULL, NULL)
      , ('bannedott@fixture.example.com',  'fx_bannedott',  872573, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        'Ms. F. Banned',   1554.00,    FALSE,          'FAKEPP1244',        'Ailuropoda melanoleuca', 'by', 'Fixture BannedOTT', NULL, NULL)
      , ('bannedott@fixture.example.com',  'fx_bannedott',  872577, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 WEEK,  FALSE,        'Ms. F. Banned',   4434.00,    FALSE,          'FAKEPP1254',        'Ursus americanus', 'by', 'Fixture BannedOTT', NULL, NULL)
      , ('agemixture@fixture.example.com', 'fx_agemixture', 767829, NOW() - INTERVAL 3 MONTH, NOW() + INTERVAL 1 MONTH, TRUE,         'Dr. F. Agemix',   5344.00,    FALSE,          'FAKEPP1264',        'Anhima cornuta', 'by', 'Fixture Agemixture', 'This is for my university', 'The horned screamer is a massive 84–95 cm (33–37.5 in) long, 3.5 kg (7.7 lb) bird, with a small chicken-like bill. The upperparts, head, and breast are black, with white speckles on the crown, throat and wing coverts. There is a long spiny structure projecting forward from the crown. This structure is unique among birds and is not derived from a feather but is a cornified structure that is loosely attached to the skull and grows continuously while often breaking at its tip.[9] This gives this species its name. It has very long and lanky legs and three large toes in each. The belly and under wing coverts are white. It has two sharp spurs on its wings and feet which are only partially webbed.')
      , ('agemixture@fixture.example.com', 'fx_agemixture', 860132, NOW() - INTERVAL 2 MONTH, NOW() + INTERVAL 2 MONTH, TRUE,         'Dr. F. Agemix',   3234.00,    TRUE,           'FAKEPP1274',        'Chauna torquata', 'by', 'Fixture Agemixture', 'I like it', NULL)
      , ('agemixture@fixture.example.com', 'fx_agemixture', 241848, NOW() - INTERVAL 1 MONTH, NOW() + INTERVAL 3 MONTH, TRUE,         'Dr. F. Agemix',   9994.00,    FALSE,          'FAKEPP1284',        'Chauna chavaria', 'for', 'Mr. Agemixture', NULL, NULL)
      ;

INSERT INTO expired_reservations
        (e_mail,                           username,        OTT_ID, verified_time,            sponsorship_ends,         was_renewed, user_sponsor_name, user_giftaid, user_donor_hide, PP_transaction_code, name, verified_kind, verified_name, verified_more_info)
 VALUES ('agemixture@fixture.example.com', 'fx_agemixture', 714464, NOW() - INTERVAL 8 MONTH, NOW() - INTERVAL 1 MONTH, FALSE,       'Dr. F. Agemix',   TRUE,         FALSE,           'FAKEPP1001',        'Anseranas semipalmata', 'by', 'Fixture Agemixture', NULL)
      , ('agemixture@fixture.example.com', 'fx_agemixture', 539138, NOW() - INTERVAL 9 MONTH, NOW() - INTERVAL 2 MONTH, FALSE,       'Dr. F. Agemix',   TRUE,         FALSE,           'FAKEPP1002',        'Thalassornis leuconotus', 'by', 'Fixture Agemixture', NULL)
      , ('agemixture@fixture.example.com', 'fx_agemixture', 767829, NOW() - INTERVAL 12 MONTH,NOW() - INTERVAL 8 MONTH, TRUE,        'Dr. F. Agemix',   TRUE,         FALSE,           'FAKEPP1003',        'Anhima cornuta', 'by', 'Fixture Agemixture', 'An old reservation')
      , ('agemixture@fixture.example.com', 'fx_agemixture', 767829, NOW() - INTERVAL 24 MONTH,NOW() - INTERVAL 12 MONTH,TRUE,        'Dr. F. Agemix',   TRUE,         FALSE,           'FAKEPP1003',        'Anhima cornuta', 'by', 'Fixture Agemixture', 'An old reservation')
      ;

COMMIT;
