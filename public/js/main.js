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
});