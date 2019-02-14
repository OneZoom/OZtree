"use strict";

function rand_int(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function choose(arr) {
    return arr[rand_int(0, arr.length - 1)];
}

/** Generate a div that has image as it's background */
function image_div(image_href, top, left, size) {
    var el = document.createElement('DIV');

    el.style.backgroundImage = 'url(' + image_href + ')';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.position = 'absolute';
    el.style.width = size + '%';
    el.style.height = size + '%';
    el.style.top = top + '%';
    el.style.left = left + '%';

    return el;
}

function particle_trigger(background_el, action) {
    var i, el, particle_els = background_el.querySelectorAll('.particles');

    for (i = 0; i < particle_els.length; i++) {
        el = particle_els[i];

        if (!action) {
            el.style.opacity = i === 0 ? 1 : 0;
            el.style.transform = [
                'scale(1.3)',
                'translateX(0)',
                'translateY(0)',
            ].join(' ');
            el.style.WebkitTransform = el.style.transform;
        } else if (action === "zoomout" || action === "fly-out") {
            el.style.opacity = i === 0 ? 1 : 0.2 * (particle_els.length - i);
            el.style.transform = [
                'scale(' + (1.3 - (i * 0.05)) + ')',
                'translateX(0)',
                'translateY(0)',
            ].join(' ');
            el.style.WebkitTransform = el.style.transform;
        } else if (action === "zoomin" || action === "fly-in") {
            el.style.opacity = i === 0 ? 1 : 0.2 * (particle_els.length - i);
            el.style.transform = [
                'scale(' + (1.3 + (i * 0.05)) + ')',
                'translateX(0)',
                'translateY(0)',
            ].join(' ');
            el.style.WebkitTransform = el.style.transform;
        } else if (action.indexOf("pan-") === 0) {
            el.style.opacity = i === 0 ? 1 : 0.2 * (particle_els.length - i);
            el.style.transform = [
                'scale(1.3)',
                'translateX(' + (0 + (i-1) * (action.indexOf('left') > -1 ? 5 : action.indexOf('right') > -1 ? -5 : 0)) + 'px)',
                'translateY(' + (0 + (i-1) * (action.indexOf('up') > -1 ? 5 : action.indexOf('down') > -1 ? -5 : 0)) + 'px)',
            ].join(' ');
            el.style.WebkitTransform = el.style.transform;
        }

        if (action === 'fly-out' || action === 'fly-in') {
            el.classList.add('paused');
        } else {
            // Start up again, once opacity has faded out
            window.setTimeout(function (el2) {
                el2.classList.remove('paused');
            }, 300, el);
        }
    }
}

function particles(background_el) {
    var particle_els;

    background_el.innerHTML = '<div class="particles"><div class="particles-inner"></div></div>' +
                              '<div class="particles"><div class="particles-inner"></div></div>' +
                              '<div class="particles"><div class="particles-inner"></div></div>';
    particle_els = background_el.querySelectorAll('.particles');

    window.setTimeout(function () {
        var i;

        for (i = 0; i < particle_els.length; i++) {
            particle_els[i].style.transform = 'scale(1.3)';
            particle_els[i].style.WebkitTransform = particle_els[i].style.transform;
            particle_els[i].style.opacity = i === 0 ? 1 : 0;
        }
    }, 1000);

    // Poll until we can attach our hook
    window.setTimeout(function set_action_hook() {
      if (window.onezoom) {
          window.onezoom.add_hook('set_action', particle_trigger.bind(this, background_el));
      } else {
          window.setTimeout(set_action_hook, 100);
      }
    }, 100);
}

function floating(background_el, urls, start_horiz, initial_spacing) {
    var url = choose(urls),
        css_class = 'floating_' + url.replace(/\W/g, '_'),
        el;

    if (!el) {
        el = image_div(url, 0, start_horiz > 0 ? rand_int(0, 40) : rand_int(-10, 20), rand_int(40, 70));
        el.style.opacity = 0;
        el.style.transform = [
            'translateZ(0)',  // NB: Prod browser into using GPU
            'translate(' + start_horiz + '%, ' + rand_int(initial_spacing * 120, initial_spacing * 130) + '%)',
        ].join(' ');
        el.style.WebkitTransform = el.style.transform;
        el.style.transition = [
            'transform ' + initial_spacing * 400 + 's linear',
            '-webkit-transform ' + initial_spacing * 400 + 's linear',
            'opacity 15s',
        ].join(',');
        el.style.WebkitTransition = el.style.transition;
        el.classList.add('floating');
        el.classList.add(css_class);
        background_el.appendChild(el);
    }

    window.setTimeout(function () {
        el.style.opacity = 0.3;
        el.style.transform = [
            'translateZ(0)',  // NB: Prod browser into using GPU
            'translate(' + (start_horiz + rand_int(-20,20)) + '%, -100%)',
            'rotate(' + rand_int(-90, 90) + 'deg)',
        ].join(' ');
        el.style.WebkitTransform = el.style.transform;
    }, 50);

    window.setTimeout(floating.bind(this, background_el, urls, start_horiz, 1), initial_spacing * 120000 * 2);

    window.setTimeout(function () {
        el.style.opacity = 0;
    }, initial_spacing * 360000);

    window.setTimeout(function () {
        background_el.removeChild(el);
    }, 600000);
}

function haze(parent_el) {
    var el,
        color = window.last_location_color || '#34ca00';

    if (parent_el.childElementCount === 0 || parent_el.lastChild.getAttribute('data-color') !== color) {
        el = document.createElement('DIV');

        el.setAttribute('data-color', color);
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.background = 'radial-gradient(ellipse at ' + rand_int(10, 90) + '% ' + rand_int(10, 90) + '%, ' + color + ', transparent)';
        el.style.opacity = 0;
        el.style.transition = [
            'opacity 5s ease-in-out',
        ].join(',');
        parent_el.appendChild(el);

        window.setTimeout(function () {
            var i,
                reversed_nodes = Array.prototype.slice.call(parent_el.childNodes).reverse();

            for (i = 0; i < reversed_nodes.length; i++) {
                if (i === 0) {
                    // Display newest node
                    reversed_nodes[i].style.opacity = 0.25;
                } else if (i === 1) {
                    // Hide second-newest node
                    reversed_nodes[i].style.opacity = 0;
                } else {
                    // Anything else gets removed
                    parent_el.removeChild(reversed_nodes[i]);
                }
            }
        }, 50);
    }
    window.setTimeout(haze.bind(this, parent_el), 5000);
}

function init_background(images) {
    function layer(sibling_el) {
        var el = document.createElement('DIV');

        el.className = 'background-layer';
        document.body.insertBefore(el, sibling_el);
        return el;
    }

    floating(layer(document.body.firstChild), images['tree'], -20, 0 / 2);
    floating(layer(document.body.firstChild), images['tree'], 20, 1 / 2);
    particles(layer(document.body.firstChild));
    haze(layer(document.body.querySelector('#UI')));
}
