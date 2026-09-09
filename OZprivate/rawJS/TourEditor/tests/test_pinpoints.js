/**
 * Usage: npm test
 *        node OZprivate/rawJS/run_tape.js OZprivate/rawJS/TourEditor/tests/test_pinpoints.js
 */
import test from 'tape';
import { node_to_pinpoint } from '../../OZTreeModule/src/navigation/pinpoint';
import { setup_fake_window } from '../../OZTreeModule/tests/util_dom';
import { nodeToOTTPinpoint } from '../src/pinpoints';

function setup(t) {
    setup_fake_window(t, {
        onezoom: {
            utils: { node_to_pinpoint },
        },
    });
}

function node(partial) {
    return {
        ozid: 1,
        child_index_towards: () => null,
        ...partial,
    };
}

test('nodeToOTTPinpoint: includes a latin name when the node also has an OTT', (t) => {
    setup(t);
    t.equal(
        nodeToOTTPinpoint(node({ ott: 244265, latin_name: 'Mammalia' })),
        '@Mammalia=244265',
        'latin name kept alongside the OTT',
    );
    t.equal(
        nodeToOTTPinpoint(node({ ott: 244265 })),
        '@=244265',
        'OTT-only node',
    );
    t.end();
});

test('nodeToOTTPinpoint: prefers an ancestor pair to a latin name', (t) => {
    setup(t);
    t.equal(
        nodeToOTTPinpoint(node({
            latin_name: 'Felidae',
            children: [
                node({ ott: 1001 }),
                node({ ott: 1002 }),
            ],
        })),
        '@_ancestor=1001=1002',
    );
    t.end();
});

test('nodeToOTTPinpoint: ancestor pair when the node has no OTT', (t) => {
    setup(t);
    t.equal(
        nodeToOTTPinpoint(node({
            ozid: 123456,
            children: [
                node({ children: [node({ ott: 1001 })] }),
                node({ children: [node({ ott: 1003 })] }),
            ],
        })),
        '@_ancestor=1001=1003',
    );
    t.end();
});

test('nodeToOTTPinpoint: latin-only without descendant OTTs is not stable', (t) => {
    setup(t);
    t.equal(
        nodeToOTTPinpoint(node({ latin_name: 'Felidae' })),
        null,
    );
    t.end();
});

test('nodeToOTTPinpoint: ozid-only is not stable', (t) => {
    setup(t);
    t.equal(
        nodeToOTTPinpoint(node({ ozid: 123456 })),
        null,
    );
    t.equal(
        nodeToOTTPinpoint(node({
            ozid: 123456,
            children: [node({ ott: 1001 })],
        })),
        null,
        'A single descendant OTT is not enough for an ancestor pair',
    );
    t.end();
});
