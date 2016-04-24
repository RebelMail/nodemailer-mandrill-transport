'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;

var mandrillTransport = require('../');

var packageData = require('../package.json');

describe('MandrillTransport', function() {
  it('should expose name and version', function() {
    var transport = mandrillTransport();
    expect(transport.name).to.equal('Mandrill');
    expect(transport.version).to.equal(packageData.version);
  });

  describe('#send', function() {
    var transport = mandrillTransport();
    var client = transport.mandrillClient;

    var payload = {
      data: {
        to: 'SpongeBob SquarePants <spongebob@bikini.bottom>, Patrick Star <patrick@bikini.bottom>',
        cc: 'Squidward Tentacles <squidward@bikini.bottom>, Sandy Cheeks <sandy@bikini.bottom>',
        bcc: 'Mr. Krabs <krabs@bikini.bottom>, Plankton <plankton@bikini.bottom>',
        from: 'Gary the Snail <gary@bikini.bottom>',
        subject: 'Meow...',
        text: 'Meow!',
        html: '<p>Meow!</p>'
      }
    };

    var status;

    function messageSentCallback(data, resolve) {
      var message = data.message;
      expect(message).to.exist;
      expect(message.to.length).to.equal(6);
      expect(message.to[0].name).to.equal('SpongeBob SquarePants');
      expect(message.to[0].email).to.equal('spongebob@bikini.bottom');
      expect(message.to[1].name).to.equal('Patrick Star');
      expect(message.to[1].email).to.equal('patrick@bikini.bottom');
      expect(message.to[2].type).to.equal('cc');
      expect(message.to[2].name).to.equal('Squidward Tentacles');
      expect(message.to[2].email).to.equal('squidward@bikini.bottom');
      expect(message.to[3].type).to.equal('cc');
      expect(message.to[3].name).to.equal('Sandy Cheeks');
      expect(message.to[3].email).to.equal('sandy@bikini.bottom');
      expect(message.to[4].type).to.equal('bcc');
      expect(message.to[4].name).to.equal('Mr. Krabs');
      expect(message.to[4].email).to.equal('krabs@bikini.bottom');
      expect(message.to[5].type).to.equal('bcc');
      expect(message.to[5].name).to.equal('Plankton');
      expect(message.to[5].email).to.equal('plankton@bikini.bottom');
      expect(message.from_name).to.equal('Gary the Snail');
      expect(message.from_email).to.equal('gary@bikini.bottom');
      expect(message.subject).to.equal('Meow...');
      expect(message.text).to.equal('Meow!');
      expect(message.html).to.equal('<p>Meow!</p>');

      resolve([{ _id: 'fake-id', status: status }]);
    }

    var sendStub = sinon.stub(client.messages, 'send', messageSentCallback);
    var sendTemplateStub = sinon.stub(client.messages, 'sendTemplate', messageSentCallback);

    after(function() {
      sendStub.restore();
      sendTemplateStub.restore();
    });

    afterEach(function() {
      sendStub.reset();
      sendTemplateStub.reset();
    });

    it('sent response', function(done) {
      status = 'sent';
      transport.send(payload, function(err, info) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        expect(info.accepted.length).to.equal(1);
        expect(info.rejected.length).to.equal(0);
        expect(info.messageId).to.equal('fake-id');
        done();
      });
    });

    it('queued response', function(done) {
      status = 'queued';
      transport.send(payload, function(err, info) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        expect(info.accepted.length).to.equal(1);
        expect(info.rejected.length).to.equal(0);
        expect(info.messageId).to.equal('fake-id');
        done();
      });
    });

    it('scheduled response', function(done) {
      status = 'scheduled';
      transport.send(payload, function(err, info) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        expect(info.accepted.length).to.equal(1);
        expect(info.rejected.length).to.equal(0);
        expect(info.messageId).to.equal('fake-id');
        done();
      });
    });

    it('invalid response', function(done) {
      status = 'invalid';
      transport.send(payload, function(err, info) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        expect(info.accepted.length).to.equal(0);
        expect(info.rejected.length).to.equal(1);
        done();
      });
    });

    it('rejected response', function(done) {
      status = 'rejected';
      transport.send(payload, function(err, info) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        expect(info.accepted.length).to.equal(0);
        expect(info.rejected.length).to.equal(1);
        done();
      });
    });

    it('can override Mandrill API options', function(done) {
      payload.data.mandrillOptions = {
        message: {
          preserve_recipients: true
        }
      };

      sendStub.restore();
      sendStub = sinon.stub(client.messages, 'send', function(data, resolve) {
        expect(data.message.preserve_recipients).to.be.true;
        resolve([{ _id: 'fake-id', status: 'sent' }]);
      });

      transport.send(payload, function(err) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.true;
        done();
      });
    });

    it('use a mandrill template', function(done) {
      payload.data.mandrillOptions = {
        template_name: 'krusty-krab-newsletter'
      };

      transport.send(payload, function(err) {
        expect(err).to.not.exist;
        expect(sendStub.calledOnce).to.be.false;
        expect(sendTemplateStub.calledOnce).to.be.true;
        done();
      });
    });
  });

  describe('#send attachments usage', function() {
    var nodemailer = require('nodemailer'),
      transport = mandrillTransport(),
      client = transport.mandrillClient,
      wrappedTransport = nodemailer.createTransport(transport),
      sendOptions;

    before(function() {
      sinon.stub(client.messages, 'send', function(options, cb) {
        sendOptions = options;
        cb([]);
      });
    });

    beforeEach(function() {
      sendOptions = {};
    });

    after(function() {
      client.messages.send.restore();
    });

    it('attachments object', function(done) {
      wrappedTransport.sendMail({
        from: 'Gary the Snail <gary@bikini.bottom>',
        to: 'SpongeBob SquarePants <spongebob@bikini.bottom>, patrick@bikini.bottom',
        cc: 'Squidward Tentacles <squidward@bikini.bottom>',
        bcc: 'krabs@bikini.bottom',
        subject: 'Meow...',
        text: 'Meow!',
        html: '<p>Meow!</p>',
        attachments: [
          {
            filename: 'bufferIsABase64.txt',
            content: new Buffer('hello world!', 'utf-8')
          },
          {
            filename: 'text.csv',
            content: new Buffer('hello;world!\n1;2', 'utf-8'),
            contentType: 'text/csv'
          },
          {
            filename: 'encoded.txt',
            content: new Buffer('i am base64', 'utf-8').toString('base64'),
            encoding: 'base64'
          },
          {   // data uri as an attachment
            path: 'data:text/plain;base64,' + new Buffer('HELLOWORLD', 'utf-8').toString('base64')
          }
        ]
      }, function(err) {
        expect(err).to.be.null;
        var message = sendOptions.message;
        expect(message.from_name).to.equal('Gary the Snail');
        expect(message.from_email).to.equal('gary@bikini.bottom');
        expect(message.to[0].name).to.equal('SpongeBob SquarePants');
        expect(message.to[0].email).to.equal('spongebob@bikini.bottom');
        expect(message.to[1].name).to.equal('');
        expect(message.to[1].email).to.equal('patrick@bikini.bottom');
        expect(message.to[2].type).to.equal('cc');
        expect(message.to[2].name).to.equal('Squidward Tentacles');
        expect(message.to[2].email).to.equal('squidward@bikini.bottom');
        expect(message.to[3].type).to.equal('bcc');
        expect(message.to[3].name).to.equal('');
        expect(message.to[3].email).to.equal('krabs@bikini.bottom');
        expect(message.subject).to.equal('Meow...');
        expect(message.text).to.equal('Meow!');
        expect(message.html).to.equal('<p>Meow!</p>');

        expect(sendOptions.message.attachments).to.have.lengthOf(4);

        expect(sendOptions.message.attachments[0].name).to.equal('bufferIsABase64.txt');
        expect(sendOptions.message.attachments[0].type).to.equal('text/plain');
        expect(new Buffer(sendOptions.message.attachments[0].content, 'base64').toString('utf-8')).to.equal('hello world!');

        expect(sendOptions.message.attachments[1].name).to.equal('text.csv');
        expect(sendOptions.message.attachments[1].type).to.equal('text/csv');
        expect(new Buffer(sendOptions.message.attachments[1].content, 'base64').toString('utf-8')).to.equal('hello;world!\n1;2');

        expect(sendOptions.message.attachments[2].name).to.equal('encoded.txt');
        expect(sendOptions.message.attachments[2].type).to.equal('text/plain');
        expect(new Buffer(sendOptions.message.attachments[2].content, 'base64').toString('utf-8')).to.equal('i am base64');

        expect(sendOptions.message.attachments[3].name).to.equal('attachment-4.txt');
        expect(sendOptions.message.attachments[3].type).to.equal('text/plain');
        expect(new Buffer(sendOptions.message.attachments[3].content, 'base64').toString('utf-8')).to.equal('HELLOWORLD');
        done();
      });
    });
  });
});
