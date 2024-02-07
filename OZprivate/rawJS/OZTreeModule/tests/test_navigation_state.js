/**
  * Usage: npx babel-tape-runner OZprivate/rawJS/OZTreeModule/tests/test_navigation_state.js
  */
import { parse_state, deparse_state } from '../src/navigation/state.js';
import test from 'tape';

test('parse_state', function (t) {
    function pwl(href) {
        return parse_state(new URL(href));
    }

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita?pop=ol_6794"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@Myzopoda_aurita',
        tap_action: {action: 'ow_leaf', data: 6794},
    }, "Pinpoint with latin name & OTT, pop-up action")

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita=6794"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@Myzopoda_aurita=6794',
    }, "Pinpoint with latin name & OTT")

    t.deepEqual(pwl("http://onezoom.example.com/life/@=6794"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@=6794',
    }, "Pinpoint with OTT")

    t.deepEqual(pwl("http://onezoom.example.com/life/"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: null,
    }, "No pinpoint")

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita?otthome=%40_ancestor%3D983483%3D3600795"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@Myzopoda_aurita',
        home_ott_id: '@_ancestor=983483=3600795',
    }, "Pinpoint with latin name & OTT, common-ancestor otthome")

    t.deepEqual(pwl("http://onezoom.example.com/life/@Myzopoda_aurita?highlight=fan:@biota&initmark=12345&highlight=fan:@mammalia"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@Myzopoda_aurita',
        highlights: ['fan:@biota', 'path:@_ozid=12345', 'fan:@mammalia'],
    }, "initmark included in highlights")

    t.deepEqual(parse_state("http://onezoom.example.com/life/@Myzopoda_aurita?pop=ol_6794"), {
        url_base: 'http://onezoom.example.com/life/',
        pinpoint: '@Myzopoda_aurita',
        tap_action: {action: 'ow_leaf', data: 6794},
    }, "Can parse URL directly")

    t.deepEqual(parse_state("?highlight=path:@biota&otthome=@aves"), {
        highlights: [ 'path:@biota' ],
        home_ott_id: '@aves',
    }, "Can parse just a querystring by handing in a fake location object");

    t.deepEqual(parse_state(parse_state("?highlight=path:@biota&otthome=@aves")), {
        highlights: [ 'path:@biota' ],
        home_ott_id: '@aves',
    }, "Can parse an already-parsed state object");

    t.deepEqual(parse_state("?highlight="), {
        highlights: [ ],
    }, "'highlight=' generates an empty highlight array (to clear highlights");

    t.deepEqual(parse_state("?"), {
    }, "A single question mark generates a do-nothing state");

    global.window = { location: new URL("http://onezoom.example.com/cake/@pinpoint") };
    t.deepEqual(parse_state("@Myzopoda_aurita?pop=ol_6794"), {
      url_base: 'http://onezoom.example.com/cake/',
      pinpoint: '@Myzopoda_aurita',
      tap_action: {action: 'ow_leaf', data: 6794},
    }, "@pinpoint parsed relative to current page");

    t.end();
});


test('deparse_state', function (t) {
    function test_url_match(url, expected_href = url, message = expected_href + " unchanged") {
        t.deepEqual(
            deparse_state(parse_state(new URL(url))).href,
            expected_href,
            message,
        );
    }
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita=6794?otthome=824869#x1402,y364,w1.4013");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita=6794?ssaver=600&cols=ICUN");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita?pop=ol_6794");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita");
    test_url_match("http://onezoom.example.com/life/@=6794#x1402,y364,w1.4013");
    test_url_match("http://onezoom.example.com/life/@Myzopoda_aurita?otthome=%40_ancestor%3D983483%3D3600795");

    t.end();
});
