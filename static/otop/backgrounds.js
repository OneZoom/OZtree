"use strict";

function rand_int(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
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

function particles(background_el, url) {
    var el = background_el.querySelector('.particles');

    if (!el) {
        el = image_div(url, -20, -20, 120);
        el.style.backgroundSize = 'cover';
        el.style.opacity = 0;
        el.style.transform = [
            'perspective(2000px)',
            'rotateX(10deg)',
            'rotateZ(' + rand_int(0, 360) + 'deg)',
        ].join(' ');
        el.style.transition = [
            'transform 30s ease-out',
            'opacity 15s',
        ].join(',');
        el.classList.add('particles');
        background_el.appendChild(el);
    }

    window.setTimeout(function () {
        var start_rotate = parseInt(el.style.transform.match(/rotateZ\((\d+)/)[1], 10);
        start_rotate += 3*rand_int(10, 15);
        el.style.opacity = 0.6;
        el.style.transform = [
            'perspective(2000px)',
            'rotateX(10deg)',
            'scale('+ rand_int(10,15)/10 +')',
            'rotateZ(' + start_rotate + 'deg)',
        ].join(' ');
    }, 50);

    window.setTimeout(particles.bind(this, background_el, url), 25000);
}

function floating(background_el, url, initial_spacing) {
    var css_class = 'floating_' + url.replace(/\W/g, '_'),
        start_horiz = rand_int(-20, 120),
        el;

    if (!el) {
        el = image_div(url, 0, rand_int(0, 10), 50);
        el.style.opacity = 0;
        el.style.transform = [
            'translateZ(0)',  // NB: Prod browser into using GPU
            'translate(' + start_horiz + '%, ' + rand_int(initial_spacing * 120, initial_spacing * 130) + '%)',
            'scale(' + ((1 - initial_spacing) * 2 + 1) + ')',
        ].join(' ');
        el.style.transition = [
            'transform ' + initial_spacing * 200 + 's linear',
            'opacity 15s',
        ].join(',');
        el.classList.add('floating');
        el.classList.add(css_class);
        background_el.appendChild(el);
    }

    window.setTimeout(function () {
        el.style.opacity = 0.2;
        el.style.transform = [
            'translateZ(0)',  // NB: Prod browser into using GPU
            'translate(' + (start_horiz + rand_int(-20,20)) + '%, -100%)',
            'rotate(' + rand_int(-90, 90) + 'deg)',
            'scale(1)',
        ].join(' ');
    }, 50);

    window.setTimeout(floating.bind(this, background_el, url, 1), initial_spacing * 60000);

    window.setTimeout(function () {
        el.style.opacity = 0;
    }, initial_spacing * 180000);

    window.setTimeout(function () {
        background_el.removeChild(el);
    }, 300000);
}

function haze(parent_el) {
    var el = document.createElement('DIV'),
        color = 'hsl(' + (window.last_location_color || '291, 44%, 12%') + ')';

    el.style.width = "100%";
    el.style.height = "100%";
    el.style.background = 'radial-gradient(ellipse at ' + rand_int(10, 90) + '% ' + rand_int(10, 90) + '%, ' + color + ', transparent)';
    el.style.opacity = !window.last_location_color ? 0.3 : 0;  // Initial haze should be there from start
    el.style.transition = [
        'opacity 15s ease-in-out',
    ].join(',');
    parent_el.appendChild(el);

    window.setTimeout(function () {
        el.style.opacity = 0.2;
    }, 50);

    window.setTimeout(haze.bind(this, parent_el), 10000);

    window.setTimeout(function () {
        el.style.opacity = 0;
    }, 11000);

    window.setTimeout(function () {
        parent_el.removeChild(el);
    }, 20000);
}

function init_background(images) {
    var i, background_el = document.createElement('DIV'),
        foreground_el = document.createElement('DIV');

    function choose_image(t) {
        return images[t][rand_int(0, images[t].length - 1)];
    }

    background_el.className = 'background-layer';
    document.body.insertBefore(background_el, document.body.firstChild);
    foreground_el.className = 'background-layer';
    document.body.insertBefore(foreground_el, document.body.querySelector('#UI'));

    for (i = 0 ; i < images['tree'].length; i++) {
        floating(background_el, images['tree'][i], i / images['tree'].length);
    }
    particles(background_el, choose_image('particle'));
    haze(foreground_el);
}
