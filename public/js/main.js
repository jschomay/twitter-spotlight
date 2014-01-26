// All front end code for now
// Mostly just click handlers, fairly minimal
// May be changed to use backbone and compiled if needed

$(function() {

  // click on spotlighted tweet opens in twitter
  $('.tweet').click(function(){
    $el = $(this);
    if ($el.hasClass('system-tweet'))
      return;
    else if ($el.hasClass('minimized')){
      $el.removeClass('minimized');
      return;
    }
    else
      window.location.href ='https://twitter.com/'+$el.attr('data-screen_name')+'/status/'+$el.attr('data-id_str');
  });
  $('.tweet a').click(function(e){
    if ($(this).parents('.tweet').hasClass('minimized')) {
      // don't follow links
      e.preventDefault();
    } else {
      // don't open on twitter if clicking on a link
      e.stopPropagation();
    }
  });

  // feedback form
  var $feedbackForm = $('.feedback-form');
  $feedbackForm.click(function(e){e.stopPropagation();});
  $feedbackForm.on('click', '.submit', function(e) {
    e.preventDefault();
    $submit = $(this).attr("disabled", true);
    $.ajax({
      type: "POST",
      url: "/feedback",
      data: "feedback="+$feedbackForm.children('textarea').val(),
      success: function() {
        $feedbackForm.html("Thanks for the feedback!");
      },
      error: function() {
        $submit
          .attr("disabled", false)
          .val("Error sending, you can try again");
      }
    });
  });

  // info bar
  $infoBar = $(".info-bar");
  $(".show-options").click(function(){
    $infoBar.toggleClass("expanded");
  });

  // spotlight mode
  $stream = $(".stream");
  $selectMode = $("select[name=spotlight-mode]");
  $selectMode.focus(function(){
    $selectMode.data('spotlightMode', this.value);
  }).change(function(){
    $stream.removeClass($selectMode.data('spotlightMode')).addClass(this.value);
    $selectMode.data('spotlightMode', this.value);
  });

  // config options (save to cookie)
  $("form.config").submit(function(e){
    e.preventDefault();
    createCookie('ttsconfig',$(this).serialize());
    $infoBar.toggleClass("expanded");
    window.location.reload(true);
  });

  // show reasons
  $(".spotlight-indicator").click(function(e){
    $(e.target).siblings('.reasons').toggleClass('reveal');
  });

});


// mark page was visited (to show system tweets to first time users only)
createCookie('ttslastvisit', new Date().getTime(), 180);

// quick cookie util (http://www.quirksmode.org/js/cookies.html)
function createCookie(name,value,days) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
  }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {
  createCookie(name,"",-1);
}