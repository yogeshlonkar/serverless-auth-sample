const dynamodb = require('src/lib/dynamodb');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const AUTH0_CLIENT_ID = 'some-awsome-client-id';
const AUTH0_CLIENT_PRIVATE_KEY = fs.readFileSync('private.key', 'utf8');
const AUTH0_CLIENT_PUBLIC_KEY = fs.readFileSync('public.key', 'utf8');
const AUTH0_TOKEN_TIMEOUT = 30 * 60 * 1000;
process.env.AUTH0_CLIENT_ID = AUTH0_CLIENT_ID;
process.env.AUTH0_CLIENT_PUBLIC_KEY = AUTH0_CLIENT_PUBLIC_KEY;
process.env.AUTH0_CLIENT_PRIVATE_KEY = AUTH0_CLIENT_PRIVATE_KEY;
const handler = require('src/handlers/authHandler');

describe('authHandler.auth', () => {
    const ogError = console.error;

    beforeEach(() => {
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = ogError;
    });

    it('should return "Unauthorized" if authorizationToken not provided', (done) => {
        handler.auth({}, {}, (actual) => {
            expect(actual).toEqual('Unauthorized');
            done();
        });
    });

    it('should return "Unauthorized" authorizationToken is not Bearer', (done) => {
        handler.auth({ authorizationToken: 'invalidtoken' }, {}, (actual) => {
            expect(actual).toEqual('Unauthorized');
            done();
        });
    });

    it('should return "Unauthorized" if invalid token', (done) => {
        handler.auth({ authorizationToken: 'Bearer invalidvalues' }, {}, (actual) => {
            expect(actual).toEqual('Unauthorized');
            done();
        });
    });

    it('should return "Unauthorized" if verfication error', (done) => {
        const token = jwt.sign({ principalId: 'yogesh' }, AUTH0_CLIENT_PRIVATE_KEY, { audience: 'invalid audience', algorithm: 'RS256' })
        handler.auth({ authorizationToken: `Bearer ${token}` }, {}, (actual) => {
            expect(actual).toEqual('Unauthorized');
            done();
        });
    });

    it('should return "Unauthorized" if token is valid but expired', (done) => {
        const token = jwt.sign({ principalId: 'yogesh', expires: Date.now() }, AUTH0_CLIENT_PRIVATE_KEY, { audience: AUTH0_CLIENT_ID, algorithm: 'RS256' })
        handler.auth({ authorizationToken: `Bearer ${token}` }, {}, (actual) => {
            expect(actual).toEqual('Unauthorized');
            done();
        });
    });

    it('should return "Unauthorized" if token is valid && not exprired', (done) => {
        console.error = ogError
        const token = jwt.sign({ principalId: 'yogesh', expires: Date.now() + AUTH0_TOKEN_TIMEOUT }, AUTH0_CLIENT_PRIVATE_KEY, { audience: AUTH0_CLIENT_ID, algorithm: 'RS256' })
        handler.auth({ authorizationToken: `Bearer ${token}`, methodArn: 'aws:lambda:func:123' }, {}, (error, actual) => {
            expect(error).toBeNull();
            expect(actual).toEqual({
                principalId: "yogesh",
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Action: "execute-api:Invoke",
                            Effect: "Allow",
                            Resource: "aws:lambda:func:123"
                        }
                    ]
                }
            });
            done();
        });
    });
});

describe('authHandler.login', () => {
    const ogError = console.error;
    let awsRequest;

    beforeAll(() => {
        process.env.DYNAMODB_USER_TABLE = 'sample-streaming-service-dev-user';
    });

    beforeEach(() => {
        awsRequest = {
            promise: jest.fn()
        };
        dynamodb.scan = jest.fn();
        dynamodb.scan.mockReturnValueOnce(awsRequest);
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = ogError;
    });

    it('should reject login if username password not provided', async () => {
        const actual = await handler.login({ body: JSON.stringify({}) });
        expect(actual).toEqual(generateResult(401, { message: 'Invalid username/password' }));
    });

    it('should validate username against password and reject if not matched', async () => {
        awsRequest.promise.mockResolvedValueOnce({ Count: 1, Items: [ { username: 'yogesh', password: 'awsomepassword'} ]});
        const actual = await handler.login({ body: JSON.stringify({ username: 'yogesh', password: 'invalidpassword' }) });
        expect(actual).toEqual(generateResult(401, { message: 'Invalid username/password' }));
    });

    it('should return jwt token in response if username valid', async () => {
        awsRequest.promise.mockResolvedValueOnce({ Count: 1, Items: [ { username: 'yogesh', password: 'awsomepassword'} ]});
        const actual = await handler.login({ body: JSON.stringify({ username: 'yogesh', password: 'awsomepassword' }) });
        expect(actual).toHaveProperty('statusCode', 200);
        expect(actual).toHaveProperty('body');
        expect(JSON.parse(actual.body)).toHaveProperty('message', 'Login successful');
        expect(JSON.parse(actual.body)).toHaveProperty('token');
    });
});

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