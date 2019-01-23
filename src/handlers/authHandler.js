const jwt = require('jsonwebtoken');
const dynamodb = require('../lib/dynamodb');
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_PUBLIC_KEY = process.env.AUTH0_CLIENT_PUBLIC_KEY;
const AUTH0_CLIENT_PRIVATE_KEY = process.env.AUTH0_CLIENT_PRIVATE_KEY;
const AUTH0_TOKEN_TIMEOUT = 30 * 60 * 1000;


const generatePolicy = (principalId, effect) => {
    const authResponse = {};
    authResponse.principalId = principalId;
    if (effect) {
        const policyDocument = {};
        policyDocument.Version = '2012-10-17';
        policyDocument.Statement = [];
        const statementOne = {};
        statementOne.Action = 'execute-api:Invoke';
        statementOne.Effect = effect;
        statementOne.Resource = "arn:aws:execute-api:*:*:*/*/*/**";
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
};
/**
 * Function handler for authorization
 *
 * @param {Object} event
 * @param {String} event.path
 * @param {Object.<string, string>} event.headers
 * @param {Object.<string, string>} event.pathParameters
 * @param {Object} event.requestContext
 * @param {String} event.resource
 * @param {String} event.httpMethod
 * @param {Object} event.queryStringParameters
 * @param {String} event.body
 * @param {Object} event.stageVariables
 * @param {String} event.authorizationToken
 * @param {function(String, Object)} callback
 * @return {{statusCode: Number, body: String}} result
 */
exports.auth = (event, context, callback) => {
    console.info('methodArn ->', event.methodArn)
    if (!event.authorizationToken) {
        return callback('Unauthorized');
    }
    const [tokenType, token] = event.authorizationToken.split(' ');
    if (tokenType !== 'Bearer') {
        return callback('Unauthorized');
    }
    try {
        jwt.verify(token, AUTH0_CLIENT_PUBLIC_KEY, { audience: AUTH0_CLIENT_ID, algorithm: 'RS256' }, (verifyError, decoded) => {
            if (verifyError) {
                console.error('verifyError', verifyError);
                // 401 Unauthorized
                console.error(`Token invalid. ${verifyError}`);
                return callback('Unauthorized');
            }
            if (!decoded.expires || decoded.expires < Date.now()) {
                return callback('Unauthorized');
            }
            return callback(null, generatePolicy(decoded.principalId, 'Allow'));
        });
    } catch (err) {
        console.error('catch error. Invalid token', err);
        return callback('Unauthorized');
    }
};

/**
 * Function handler for 
 *
 * @param {Object} event
 * @param {String} event.path
 * @param {Object.<string, string>} event.headers
 * @param {Object.<string, string>} event.pathParameters
 * @param {Object} event.requestContext
 * @param {String} event.resource
 * @param {String} event.httpMethod
 * @param {Object} event.queryStringParameters
 * @param {String} event.body
 * @param {Object} event.stageVariables
 * @return {{statusCode: Number, body: String}} result
 */
exports.login = async (event, context) => {
    try {
        const { username, password } = JSON.parse(event.body);
        if (!username || !password) {
            return generateResult(401, { message: 'Invalid username/password' });
        }
        const params = {
            TableName: process.env.DYNAMODB_USER_TABLE,
            FilterExpression: 'username = :this_username',
            ExpressionAttributeValues: { ':this_username': username }
        };
        const users = await dynamodb.scan(params).promise();
        if (users.Count !== 1) {
            return generateResult(401, { message: 'Invalid username/password' });
        }
        const { Items: [user] } = users;
        if (user.password !== password) {
            return generateResult(401, { message: 'Invalid username/password' });
        } else {
            const token = jwt.sign({ principalId: username, expires: Date.now() + AUTH0_TOKEN_TIMEOUT }, AUTH0_CLIENT_PRIVATE_KEY, { audience: AUTH0_CLIENT_ID, algorithm: 'RS256' })
            return generateResult(200, { message: 'Login successful', token });
        }
    } catch (error) {
        console.error(error);
        return generateResult(500, { message: 'authentication failure' })
    }
};

/**
 * Generate result object to return from handler
 *
 * @param {Number} code
 * @param {Object} body
 * @return {{statusCode: Number, body: String}} result
 */
const generateResult = (code, body) => {
    return {
        statusCode: code,
        body: JSON.stringify(body)
    };
};
