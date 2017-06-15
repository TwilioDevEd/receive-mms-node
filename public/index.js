function ReceiveMMSController(){
  function init() {
    $.get('/config')
      .then(function(res){
        var phoneNumber = res.twilioPhoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1($2)-$3-$4')
        console.log(phoneNumber)
        $('.twilio-number').html(phoneNumber);
      })
  }

  function pollForIncomingImages() {

  }

  return {
    init: init,
  }
}

$(document).ready(function(){
  var receiveMMSController = ReceiveMMSController();
  receiveMMSController.init();
});
