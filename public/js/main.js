// All front end code for now
// Mostly just click handlers, fairly minimal
// May be changed to use backbone and compiled if needed

$(function() {

  // click on tweet opens in twitter
  $('.tweet').click(function(){
    $el = $(this);
    if ($el.hasClass('system-tweet'))
      return;

    window.location.href ='https://twitter.com/'+$el.attr('data-screen_name')+'/status/'+$el.attr('data-id_str');
  });
  // stop proppigation if clicking on a link
  $('.tweet a').click(function(e){e.stopPropagation();});

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