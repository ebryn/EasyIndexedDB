var RSVP;

if (window.RSVP) {
  RSVP = window.RSVP;
} else if (window.Ember) {
  RSVP = window.Ember.RSVP;
}

var Promise = RSVP.Promise;

export { Promise, RSVP };
