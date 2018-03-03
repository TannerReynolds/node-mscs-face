'use strict';

// Require dependencies
const request = require('request-promise-native');
const querystring = require('querystring');

// Region settings
const regionArr = [{
        regionCode: 'WUS',
        regionName: 'westus'
    },
    {
        regionCode: 'EUS2',
        regionName: 'eastus2'
    },
    {
        regionCode: 'WCUS',
        regionName: 'westcentralus'
    },
    {
        regionCode: 'WEU',
        regionName: 'westeurope'
    },
    {
        regionCode: 'SEA',
        regionName: 'southeastasia'
    }
];

// Cognitive services face api base url
const baseUrl = '.api.cognitive.microsoft.com/face/v1.0/';

// Helper functions
const matchRegion = (regionCode = '') => {
    // Declarations
    var error;

    // If region code is empty, throw an error
    if (regionCode === '') {
        error = new Error('Region code not specified!');
        throw error;
    }

    // Match regionCode input to regionArr
    let match = regionArr.filter((regionObject) => {
        return regionObject.regionCode === regionCode.toString().toUpperCase();
    });

    // Check if matched value is valid
    if (match.length <= 0) {
        // Throw error if no valid region is matched
        error = new Error('Invalid region code, only WUS, EUS2, WCUS, WEU & SEA is available!');
        throw error;
    } else {
        // Construct face API url by region and return
        return constructRegionUrl(match[0].regionName);
    }
}

const constructRegionUrl = (regionName) => {
    // Construct region url
    return `https://${regionName}${baseUrl}`;
}

// Create constructor
function FaceApi(faceApiSubscriptionKey, regionCode) {
    // Constructor properties
    this.subscriptionKey = faceApiSubscriptionKey;
    this.apiUrl = matchRegion(regionCode);
}

// Detect function API wrapper
FaceApi.prototype.detect = function (image) {
    return new Promise((resolve, reject) => {
        // Declarations
        var error;

        // Construct query parameters
        let params = {
            returnFaceId: true,
            returnFaceLandmarks: true,
            returnFaceAttributes: "headPose"
        }

        // Construct AJAX
        request({
                method: 'POST',
                url: `${this.apiUrl}/detect?${querystring.stringify(params)}`,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: image
            })
            .then((resp) => {
                // Construct resolve object
                let faceInfo = new Object();

                // Assign response as object to faceInfo
                faceInfo = JSON.parse(resp);

                // Determine if any faces are detected
                if (faceInfo.length === 0) {
                    // Reject promise with error for 0 face detected
                    error = new Error('No face is detected.');
                    return reject(error);
                } else {
                    // Resolve promise with faceInfo object
                    return resolve(faceInfo);
                }
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with detect: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Create Person function API wrapper
FaceApi.prototype.createPerson = function (personGroupId, userData) {
    return new Promise((resolve, reject) => {
        // Declarations
        var error;

        // Construct AJAX
        request({
                method: 'POST',
                url: `${this.apiUrl}/personGroups/${personGroupId}/persons`,
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: JSON.stringify(userData)
            })
            .then((resp) => {
                // Construct response parsed object
                let createdResponse = JSON.parse(resp);

                // Logging
                console.log(`Created user with personId: ${createdResponse.personId}`);

                // Resolve promise with personId
                return resolve(createdResponse.personId);
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with create person: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Delete Person function API wrapper
FaceApi.prototype.deletePerson = function (personGroupId, personId) {
    return new Promise((resolve, reject) => {
        // Construct AJAX
        request({
                method: 'DELETE',
                url: `${this.apiUrl}/persongroups/${personGroupId}/persons/${personId}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                }
            })
            .then((resp) => {
                // Log response
                console.log(`Delete Person successful!`);

                // Resolve promise
                return resolve('');
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with deletePerson: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Add Face to Person function API wrapper
FaceApi.prototype.addFace = function (personGroupId, personId, faceRectangle, image) {
    return new Promise((resolve, reject) => {
        // Declarations
        var error;
        // Construct query parameters
        let params = {
            userData: new Date().toISOString(),
            targetFace: `${faceRectangle.left}, ${faceRectangle.top}, ${faceRectangle.width}, ${faceRectangle.height}`
        };

        // Construct AJAX
        request({
                method: 'POST',
                url: `${this.apiUrl}/persongroups/${personGroupId}/persons/${personId}/persistedFaces?${querystring.stringify(params)}`,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: image
            })
            .then((resp) => {
                // Construct response parsed object
                let createdResponse = JSON.parse(resp);

                // Logging
                console.log(`Added face to user with persistedFaceId: ${createdResponse.persistedFaceId}`);

                // Resolve promise with persistedFaceId
                return resolve(createdResponse.persistedFaceId);
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with addFace: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Create Person Group function API Wrapper
FaceApi.prototype.createPersonGroupIfNotExist = function (personGroupId, personGroupInformation) {
    return new Promise((resolve, reject) => {
        // Construct AJAX
        request({
                method: 'PUT',
                url: `${this.apiUrl}/persongroups/${personGroupId}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: JSON.stringify(personGroupInformation)
            })
            .then((resp) => {
                // Logging
                console.log(`Successfully created personGroup with id: ${personGroupId}`);

                // Resolve promise
                return resolve('');
            })
            .catch((err) => {
                // Control flow to determine error
                if (err.statusCode === 409) {
                    // If error is 409, resolve promise
                    console.log(`Person group already exists.`);
                    return resolve('');
                } else {
                    // Log error
                    console.log(`An error occurred with createPersonGroup: ${err}`);

                    // Reject promise with error
                    return reject(err);
                }
            });
    });
}

// Delete Face from person function API wrapper
FaceApi.prototype.deleteFace = function (personGroupId, personId, faceId) {
    return new Promise((resolve, reject) => {
        // Construct AJAX
        request({
                method: 'DELETE',
                url: `${this.apiUrl}/persongroups/${personGroupId}/persons/${personId}/persistedFaces/${faceId}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                }
            })
            .then((resp) => {
                // Logging
                console.log('Successfully removed face from person.');

                // Resolve promise
                resolve('');
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with deleteFace: ${err.message}`);

                // Reject promise with error
                reject(err);
            });
    });
}

// Train Person Group function API wrapper
FaceApi.prototype.trainPersonGroup = function (personGroupId) {
    return new Promise((resolve, reject) => {
        // Construct AJAX
        request({
                method: 'POST',
                url: `${this.apiUrl}/persongroups/${personGroupId}/train`,
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: ''
            })
            .then((resp) => {
                // Logging
                console.log(`Train group request sent.`);

                // Resolve promise
                resolve('');
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with trainPersonGroup: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Identify function API wrapper
FaceApi.prototype.identify = function (personGroupId, faceIds, maxNumOfCandidatesReturned, minimumConfidence) {
    return new Promise((resolve, reject) => {
        // Construct AJAX
        request({
                method: 'POST',
                url: `${this.apiUrl}/identify`,
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                body: JSON.stringify({
                    personGroupId: personGroupId,
                    faceIds: faceIds,
                    maxNumOfCandidatesReturned: maxNumOfCandidatesReturned,
                    confidenceThreshold: minimumConfidence
                })
            })
            .then((resp) => {
                // Logging
                console.log(`Successfully completed identification process.`);

                // Parse JSON and assign it to result variable
                let result = JSON.parse(resp);

                // Store candidates from results
                var candidates = result[0].candidates;

                // Resolve promise with candidates
                return resolve(candidates);
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with identify: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Custom, not regular APIs
// Extremely opinionated for my own solution
// Create full person
FaceApi.prototype.createFullPerson = function (image, userInformation, personGroupId) {
    return new Promise((resolve, reject) => {
        // Declarations
        var detectFaceRectangle;
        var respObject = new Object();

        // Detect person in image
        this.detect(image)
            .then((faceInfo) => {
                // Assign face rectangle to detectFaceRectangle variable
                detectFaceRectangle = faceInfo[0].faceRectangle;

                // Create a person instance in cognitive services
                return this.createPerson(personGroupId, userInformation);
            })
            .then((personId) => {
                // Add personId to respObject
                respObject.personId = personId;

                // Person is created, proceed to add Face to person
                return this.addFace(personGroupId, personId, detectFaceRectangle, image);
            })
            .then((persistedFaceId) => {
                // Add persistedFaceId to respObject
                respObject.persistedFaceId = persistedFaceId;

                // Return resolve of respObject
                return resolve(respObject);
            })
            .catch((err) => {
                // Log error
                console.log(`Create full person error: ${err}`);

                // Delete Person if person is created alr
                if (respObject.personId !== undefined) {
                    this.deletePerson(personGroupId, respObject.personId);
                }

                // Reject promise with error
                return reject(err);
            });
    });
}

// Update person with single image
FaceApi.prototype.updatePersonWithSingle = function (image, userInformation, personGroupId, personId, oldPersistedFaceId) {
    return new Promise((resolve, reject) => {
        // Declarations
        var detectFaceRectangle;
        var respObject = new Object();

        // Detect person in image
        this.detect(image)
            .then((faceInfo) => {
                // Assign face rectangle to detectFaceRectangle variable
                detectFaceRectangle = faceInfo[0].faceRectangle;

                // Person is created, proceed to add Face to person
                return this.addFace(personGroupId, personId, detectFaceRectangle, image);
            })
            .then((persistedFaceId) => {
                // Add persistedFaceId to respObject
                respObject.persistedFaceId = persistedFaceId;

                // Delete old persistedFaceId from person
                return this.deleteFace(personGroupId, personId, oldPersistedFaceId);
            })
            .then((result) => {
                // Return resolve of respObject
                return resolve(respObject);
            })
            .catch((err) => {
                // Log error
                console.log(`Update person with single error: ${err}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

// Recognize person from image
FaceApi.prototype.recognize = function (image, personGroupId, maxNumOfCandidatesReturned, minimumConfidence) {
    return new Promise((resolve, reject) => {
        // Detect person in image
        this.detect(image)
            .then((faceInfo) => {
                // Obtain closest face's faceId from detect
                let foundFaceId = faceInfo[0].faceId;

                // Construct faceId array
                let faceIds = new Array();
                faceIds.push(foundFaceId);

                // Logging
                console.log(`Detection completed for recognition process, proceeding to identification.`);

                // Identify person with faceIds from faceInfo
                return this.identify(personGroupId, faceIds, maxNumOfCandidatesReturned, minimumConfidence);
            })
            .then((candidates) => {
                // Control flow to validate if anyone is identified and what to do with data
                if (candidates.length > 0) {
                    // Logging
                    console.log(`People successfully identified from image, getting information for the most familiar candidate identified.`);

                    // Construct candidate object for single closest identified person
                    let candidate = new Object();
                    candidate.personId = candidates[0].personId;
                    candidate.confidence = candidates[0].confidence;

                    // Resolve promise with single closest identified candidate
                    return resolve(candidate);
                } else {
                    // Logging
                    console.log(`No one is identified in image, resolving promise with a null.`);

                    // Resolve with null if no one is identified in image
                    return resolve(null);
                }
            })
            .catch((err) => {
                // Log error
                console.log(`An error occurred with recognize: ${err.message}`);

                // Reject promise with error
                return reject(err);
            });
    });
}

module.exports = FaceApi;
