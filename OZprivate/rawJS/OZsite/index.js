function cycleImages(){
      var $active = $('#cycler .active');
      var $next = ($active.next().length > 0) ? $active.next() : $('#cycler img:first');
      $next.css('z-index',2);//move the next image up the pile
      $active.fadeOut(1500,function(){//fade out the top image
	  $active.css('z-index',1).show().removeClass('active');//reset the z-index and unhide the image
      $next.css('z-index',3).addClass('active');//make the next image the top one
      document.getElementById('carousel_link').hash = $next.attr("title");//change the link url hash part to the title
      $("a#carousel_link .target").html(b.attr("alt"); //change some of the link title text
      });
    }

$(document).ready(function(){
// run every 7s
setInterval('cycleImages()', 7000);
})