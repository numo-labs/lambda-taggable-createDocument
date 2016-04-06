var assert = require('assert');
var handler = require('../lib/handler.js');
var simple = require('simple-mock');
var AwsHelper = require('aws-lambda-helper');
var AWS = require('aws-sdk');
var _ = require('lodash');

var utils = require('./eventFixtures');
var mockEvent = utils.event

describe('Handler functions', function () {
  it('initTagDoc: should create a doc object from the event', function (done) {
    var doc = handler.initTagDoc(mockEvent);
    assert.deepEqual(doc, mockEvent);
    done();
  });
  it.only('initTagDoc: should use the id as the displayName, tags and metadata defaulted to []', function (done) {
    var event = {
      _id: '12345',
    }
    var doc = handler.initTagDoc(event);
    assert.deepEqual(Object.keys(doc), ['_id', 'location', 'displayName', 'tags', 'metadata']);
    assert.deepEqual(doc.tags, []);
    assert.deepEqual(doc.metadata, []);
    assert.equal(doc.displayName, event._id);
    done();
  });

  it('should process an event successfully (dynamodb mocked) by calling index.handler (fail)', function (done) {
    var context = {
      'invokedFunctionArn': 'arn:aws:lambda:eu-west-1:123456789:function:aws-canary-lambda:prod',
      'fail': function (result) {
        assert.equal(result.message, 'fake-error');
        done();
      }
    };

    // Create a new stubbed event
    var event = eventFixtures.getEvent();

    // stub the SNS.publish function
    simple.mock(index._internal, 'processEvent').callFn(function (params, cb) {
      return cb(new Error('fake-error'), 'ok');
    });

    // Test the handler, assert and done in context function context.succeed
    // Retruns data
    index.handler(event, context);
  });

  it('should process an event successfully (mocked) by calling index.handler (succeed)', function (done) {
    var context = {
      'invokedFunctionArn': 'arn:aws:lambda:eu-west-1:123456789:function:aws-canary-lambda:prod',
      'succeed': function (result) {
        assert.equal(result, 'ok');
        done();
      }
    };

    // Create a new stubbed event
    var event = eventFixtures.getEvent();

    // stub the SNS.publish function
    simple.mock(index._internal, 'processEvent').callFn(function (params, cb) {
      return cb(null, 'ok');
    });

    // Test the handler, assert and done in context function context.succeed
    // Retruns data
    index.handler(event, context);
  });

  describe('execInhertanceIndex', function () {
    it('should be possible to trigger a inhertitance index when tags are different, ', function (done) {
      var context = {
        'invokedFunctionArn': 'arn:aws:lambda:eu-west-1:123456789:function:aws-canary-lambda:prod'
      };
      // Create a new stubbed event
      var _id = 'foo';
      var oldTags = [
        {
          tagId: 'geo:geonames.2510769',
          inherited: false,
          active: true
        },
        {
          tagId: 'geo:isearch.island',
          inherited: false,
          active: true
        }
      ];
      var newTags = [
        {
          tagId: 'geo:geonames.2510769',
          inherited: false,
          active: true
        },
        {
          tagId: 'geo:geonames.inherited_sample',
          inherited: true,
          active: true
        },
        {
          tagId: 'geo:isearch.island',
          inherited: false,
          active: false
        }
      ];

      // Mock the AWS Lambda Invoke
      AwsHelper.init(context);
      AwsHelper._Lambda = new AWS.Lambda();
      // stub the cloudsearch uploadDocuments function
      simple.mock(AwsHelper._Lambda, 'invoke').callFn(function (params, cb) {
        console.log(params);
        assert.equal(JSON.parse(params.Payload).tag, _id);
        done();
      });

      // Test the handler, assert and done in context function context.succeed
      // Retruns data
      index._internal.execInhertanceIndex(_id, oldTags, newTags, function (err, result) {
        done(err);
      });
    });
  });
});
