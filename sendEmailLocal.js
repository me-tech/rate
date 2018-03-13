const NotifmeSdk = require('notifme-sdk').default;

const notifme = new NotifmeSdk({
  channels: {
    email: {
      providers: [{
        type: 'sparkpost',
        apiKey: '80952a63a56a518089c9b5aa0342a240ac221c6d',
      }]
    }
  }
});

module.exports = notifme;