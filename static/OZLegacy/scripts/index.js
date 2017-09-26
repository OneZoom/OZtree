
(function($) {
    $.fn.clickToggle = function(func1, func2) {
        var funcs = [func1, func2];
        this.data('toggleclicked', 0);
        this.click(function() {
            var data = $(this).data();
            var tc = data.toggleclicked;
            $.proxy(funcs[tc], this)();
            data.toggleclicked = (tc + 1) % 2;
        });
        return this;
    };
}(jQuery));

$(document).ready(function() {
	$('iframe').attr('src', 'tetrapods_front_iframe.htm');
	$('#tetrapods_front')
			.addClass('btn_selected')
			.html('Reload');
	
	$('.group_select_btn').click(function() {
		$('.group_select_btn').html('Preview');
		$('button').removeClass('btn_selected');
		
		$(this).html('Reload');
		$(this).addClass('btn_selected');
		
		var url = $(this).attr('id');
		var src =  url + "_iframe.htm";
		$('iframe').attr('src', src);
	});
	
	$('.group_select_full_btn').click(function() {
		var url = $(this).attr('id');
		window.location.href = url + ".htm";
        win.focus();
       });
		
	$('#toggle_control').click(function(){
		if ($('#group_selection').is(':visible')) {
		    $('#iframe_box').width("94%");
		    $('#group_selection').hide();
		    drawArrow(0);
		} else {
		    $('#iframe_box').width("71%");
		    $('#group_selection').show();
		    drawArrow(1);
		}
	});
                  
    $('#about').click(function(){
       $('button').removeClass('btn_selected');
       $(this).addClass('btn_selected');
       var url = $(this).attr('id');
       var src = "http://www.youtube.com/embed/LZ3n3mV4uVc?rel=0";
       $('iframe').attr('src', src);
    });
                  
    $('#tutorial').click(function(){
    	$('button').removeClass('btn_selected');
        $(this).addClass('btn_selected');
    	var url = $(this).attr('id');
    	var src = "http://www.youtube.com/embed/ngt0XLFgN28?rel=0";
    	$('iframe').attr('src', src);
    });
});


