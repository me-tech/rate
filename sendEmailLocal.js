const NotifmeSdk = require('notifme-sdk').default;

const notifme = new NotifmeSdk({
  channels: {
    email: {
      providers: [{
        type: 'sparkpost',
        apiKey: process.env.SPARKPOST_API_KEY,
      }]
    }
  }
});

module.exports = notifme;