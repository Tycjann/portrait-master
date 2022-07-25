const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');
const sanitize = require('mongo-sanitize');
const emailAddressValidate = require('../utils/emailAddressValidate.js');
const requestIp = require('request-ip');

const ipMiddleware = function (req, res, next) {
  const clientIp = requestIp.getClientIp(req);
  console.log('clientIp:', clientIp);
  next();
};

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    // const { title, author, email } = req.fields;
    const file = req.files.file;
    const title = sanitize(req.fields.title);
    const author = sanitize(req.fields.author);
    const email = sanitize(req.fields.email);

    if (title && author && emailAddressValidate(email) && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').pop();

      if (
        (fileExt === 'png' || fileExt === 'jpg' || fileExt === 'gif')
        && title.length <= 20
        && author.length <= 50
      ) {
        const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong input!');
      }
    } else {
      throw new Error('Wrong input!');
    }

  } catch (err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  // console.log('1');

  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });

    // console.log('2');

    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {

      // console.log('3');

      const voterIp = requestIp.getClientIp(req);
      const voterFind = await Voter.findOne({ user: voterIp });

      // Voter has not yet voted
      if (!voterFind) {

        // console.log('4');

        const newVoter = new Voter({
          user: voterIp,
          $push: {
            votes: req.params.id
          }
        });
        await newVoter.save();

        photoToUpdate.votes++;
        await photoToUpdate.save();
        res.send({ message: 'OK' });
      } else {

        // console.log('5');

        const pictureFind = await Voter.findOne({ user: voterIp, votes: req.params.id });

        if (pictureFind) res.status(500).json(err);
        else {

          // console.log('6');

          await Voter.updateOne({ user: voterIp }, {
            $push: {
              votes: req.params.id
            }
          });

          photoToUpdate.votes++;
          await photoToUpdate.save();
          res.send({ message: 'OK' });
        }

      }
    }
  } catch (err) {
    res.status(500).json(err);
  }

};
