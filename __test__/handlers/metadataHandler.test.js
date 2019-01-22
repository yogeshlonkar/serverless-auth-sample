const handler = require('src/handlers/metadataHandler');
const dynamodb = require('src/lib/dynamodb');

describe('metadataHandler.createMetada', () => {
    let awsRequest;

    beforeEach(() => {
        awsRequest = {
            promise: jest.fn()
        };
        dynamodb.put = jest.fn();
        dynamodb.put.mockReturnValueOnce(awsRequest);
    });

    it('should create metadata with given id', async () => {
        awsRequest.promise.mockResolvedValueOnce(true);
        const actual = await handler.createMetadata({
            pathParameters: { id: 1234 },
            body: JSON.stringify({
                text: 'user text',
                checked: true
            })
        });
        expect(actual).toEqual(generateResult(201, { message: 'Metadata created' }))
    });

    it('should return handle error with message', async () => {
        const ogError = console.error;
        console.error = jest.fn();
        const actual = await handler.createMetadata({
            pathParameters: { id :1234 },
            body: ''
        });
        expect(actual).toEqual(generateResult(500, { message: 'Couldn\'t create metadata' }));
        console.error = ogError;
    });
});

describe('metadataHandler.getMetada', () => {
    let awsRequest;

    beforeEach(() => {
        awsRequest = {
            promise: jest.fn()
        };
        dynamodb.get = jest.fn();
        dynamodb.get.mockReturnValueOnce(awsRequest);
    });

    it('should return metadata with given id', async () => {
        const items = {
            Item: {
                id: '1234',
                text: 'text from database',
                checked: false
            }
        };
        awsRequest.promise.mockResolvedValueOnce(items);
        const actual = await handler.getMetadata({ pathParameters: { id: '1234' }}, {});
        expect(actual).toEqual(generateResult(200, items.Item));
    });

    it('should return 404 result if metadata notfound', async () => {
        awsRequest.promise.mockResolvedValueOnce({});
        const actual = await handler.getMetadata({
            pathParameters: { id: 'doesnotexists'}
        });
        expect(actual).toEqual(generateResult(404, { message: 'metadata not found'}));
    });


    it('should return handle error with message', async () => {
        const ogError = console.error;
        console.error = jest.fn();
        const actual = await handler.getMetadata({
            pathParameters: { id :1234 }
        });
        expect(actual).toEqual(generateResult(500, { message: 'Couldn\'t get metadata' }));
        console.error = ogError;
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

