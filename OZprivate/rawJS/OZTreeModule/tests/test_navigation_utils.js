/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_navigation_utils.js
  */
import { parse_window_location, deparse_state } from '../src/navigation/utils.js';
import test from 'tape';

test('parse_window_location', function (t) {
    function pwl(href) {
        return parse_window_location(new URL(href));
    }

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita?pop=ol_6794"), {
        url_base: 'http://onezoom.example.com/life/',
        latin_name: 'Myzopoda_aurita',
        tap_action: 'ow_leaf',
        tap_ott_or_id: 6794,
    }, "Extracted latin name, no OTT, pop-up action")

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita=6794"), {
        url_base: 'http://onezoom.example.com/life/',
        latin_name: 'Myzopoda_aurita',
        ott: 6794,
    }, "Extracted latin name & OTT")

    t.deepEqual(pwl("http://onezoom.example.com/life/@=6794"), {
        url_base: 'http://onezoom.example.com/life/',
        ott: 6794,
    }, "Extracted only OTT")

    t.deepEqual(pwl("http://onezoom.example.com/life/"), {
        url_base: 'http://onezoom.example.com/life/',
    }, "Extracted no OTT target")

    t.end();
});


test('deparse_state', function (t) {
    function test_url_match(url, expected_href = url, message = expected_href + " unchanged") {
        t.deepEqual(
            deparse_state(parse_window_location(new URL(url))).href,
            expected_href,
            message,
        );
    }
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita=6794?initmark=824869#x1402,y364,w1.4013");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita=6794?ssaver=600&cols=ICUN");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita?pop=ol_6794");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita");
    test_url_match("http://onezoom.example.com/life/@=6794#x1402,y364,w1.4013");

    t.end();
});
