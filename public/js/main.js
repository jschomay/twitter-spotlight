// All front end code for now
// Mostly just click handlers, fairly minimal
// May be changed to use backbone and compiled if needed

$(function() {

  // click on tweet opens in twitter
  $('.tweet').click(function(){
    $el = $(this);
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