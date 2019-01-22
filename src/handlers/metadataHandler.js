const dynamodb = require('../lib/dynamodb');

/**
 * Function handler for creating metadata
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
exports.createMetadata = async (event, context) => {
    try {
        const timestamp = new Date().getTime();
        const { id } = event.pathParameters || {};
        if (!id) {
            return generateResult(400, { message: 'metadata id is required' });
        }
        const { text, checked } = JSON.parse(event.body) || {};
        const params = {
            TableName: process.env.DYNAMODB_TABLE,
            Item: {
                id,
                text,
                checked,
                createdAt: timestamp,
                updatedAt: timestamp
            }
        };
        await dynamodb.put(params).promise();
        return generateResult(201, {
            message: 'Metadata created'
        });
    } catch (error) {
        console.error(error);
        return generateResult(500, {
            message: 'Couldn\'t create metadata'
        })
    }
};

/**
 * Function handler for getting metadata
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
exports.getMetadata = async (event, context) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) {
            return generateResult(400, { message: 'metadata id is required' });
        }
        const params = {
            TableName: process.env.DYNAMODB_TABLE,
            Key: {
                id
            }
        };
        const data = await dynamodb.get(params).promise();
        if (!data.Item) {
            return generateResult(404, { message: 'metadata not found' })
        }
        return generateResult(200, data.Item);
    } catch (error) {
        console.error(error);
        return generateResult(500, {
            message: 'Couldn\'t get metadata'
        })
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