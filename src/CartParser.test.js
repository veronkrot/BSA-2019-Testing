import CartParser from './CartParser';

let parser;

beforeEach(() => {
    parser = new CartParser();
});

describe('CartParser - unit tests', () => {
    describe('CartParser - parse method tests', () => {
        const mockReadFileMethod = () => {
            parser.readFile = jest.fn();
        };
        const setReadFileMockReturnValue = (data) => {
            parser.readFile.mockReturnValue(data);
        };


        beforeEach(() => {
            mockReadFileMethod();
        });

        test('should throw error when all the content validation failed', () => {
            const path = '';
            setReadFileMockReturnValue('1\n1');
            const expectedError = 'Validation failed!';

            expect(() => parser.parse(path)).toThrow(expectedError);
        });

        test('should generate valid json object', () => {
            const path = '';
            setReadFileMockReturnValue(
                'Product name,Price,Quantity\n' +
                'Mollis consequat,9.00,2\n' +
                'Tvoluptatem,10.32,1');
            const expectedTotalPrice = 28.32;
            const actualJson = parser.parse(path);
            expect(actualJson.items.length).toBe(2);
            const itemNames = actualJson.items.map(item => item.name);
            expect(itemNames).toEqual(expect.arrayContaining(['Mollis consequat', 'Tvoluptatem']));
            expect(actualJson.total).toBeCloseTo(expectedTotalPrice);
        });

    });

    describe('CartParser - validate method tests', () => {
        const createHeaderContent = (name, price, quantity) => {
            return `${name},${price},${quantity}\ntest,1,2`;
        };
        const createBodyContent = (name, price, quantity) => {
            return `Product name,Price,Quantity\n${name},${price},${quantity}`;
        };

        test('should return error when header validation failed', () => {
            const createErrorMessage = (actualName, expectedName) => {
                return `Expected header to be named "${expectedName}" but received ${actualName}.`;
            };
            const testData = [];
            // Product name verification
            let headerName = '';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Product name'),
                content: createHeaderContent(headerName, 'Price', 'Quantity')
            });
            headerName = 'someString';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Product name'),
                content: createHeaderContent(headerName, 'Price', 'Quantity')
            });

            // Price verification
            headerName = '';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Price'),
                content: createHeaderContent('Product name', headerName, 'Quantity')
            });
            headerName = 'someString';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Price'),
                content: createHeaderContent('Product name', headerName, 'Quantity')
            });

            // Quantity verification
            headerName = '';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Quantity'),
                content: createHeaderContent('Product name', 'Price', headerName)
            });
            headerName = 'someString';
            testData.push({
                expectedErrorMessage: createErrorMessage(headerName, 'Quantity'),
                content: createHeaderContent('Product name', 'Price', headerName)
            });

            for (let input of testData) {
                const errors = parser.validate(input.content);
                expect(errors.length).toBe(1);
                expect(errors[0].message).toBe(input.expectedErrorMessage);
                expect(errors[0].type).toBe(parser.ErrorType.HEADER);
            }
        });

        test('should not return error when header validation passed', () => {
            let content = createHeaderContent('Product name', 'Price', 'Quantity');
            const errors = parser.validate(content);
            expect(errors.length).toBe(0);
        });

        test('should not return error when body validation passed', () => {
            let content = createBodyContent('some product name', '100.4', '10');
            const bodyErrors = parser.validate(content);
            expect(bodyErrors.length).toBe(0);
        });

        test('should return error when body validation failed', () => {
            const testData = [];
            // Product name value validation
            let fieldValue = '';
            testData.push({
                expectedErrorMessage: 'Expected cell to be a nonempty string but received "".',
                content: createBodyContent(fieldValue, '10', '5')
            });
            fieldValue = '   ';
            testData.push({
                expectedErrorMessage: 'Expected cell to be a nonempty string but received "".',
                content: createBodyContent(fieldValue, '10', '5')
            });
            // Price value validation
            fieldValue = '-15';
            testData.push({
                expectedErrorMessage: `Expected cell to be a positive number but received "${fieldValue}".`,
                content: createBodyContent('some product name', fieldValue, '5')
            });

            fieldValue = 'some string';
            testData.push({
                expectedErrorMessage: `Expected cell to be a positive number but received "${fieldValue}".`,
                content: createBodyContent('some product name', fieldValue, '5')
            });
            // Quantity value validation
            fieldValue = '-15';
            testData.push({
                expectedErrorMessage: `Expected cell to be a positive number but received "${fieldValue}".`,
                content: createBodyContent('some product name', '5', fieldValue)
            });

            fieldValue = 'some string';
            testData.push({
                expectedErrorMessage: `Expected cell to be a positive number but received "${fieldValue}".`,
                content: createBodyContent('some product name', '5', fieldValue)
            });

            for (let input of testData) {
                const errors = parser.validate(input.content);
                expect(errors.length).toBe(1);
                expect(errors[0].message).toBe(input.expectedErrorMessage);
                expect(errors[0].type).toBe(parser.ErrorType.CELL);
            }
        });

        test('should return error when row length is not equal to 3', () => {
            let testData = [];
            let content = `Product name,Price,Quantity\nsome name, 10`;
            let cellsLength = 2;
            testData.push({
                expectedErrorMessage: `Expected row to have 3 cells but received ${cellsLength}.`,
                content
            });

            content = `Product name,Price,Quantity\nsome name`;
            cellsLength = 1;
            testData.push({
                expectedErrorMessage: `Expected row to have 3 cells but received ${cellsLength}.`,
                content
            });

            for (let input of testData) {
                const errors = parser.validate(input.content);
                expect(errors.length).toBe(1);
                expect(errors[0].message).toBe(input.expectedErrorMessage);
                expect(errors[0].type).toBe(parser.ErrorType.ROW);
            }
        });
    });

    describe('CartParser - calcTotal method tests', () => {
        test('should return total price', () => {
            let testData = [];

            testData.push({
                cartItems: [],
                totalPrice: 0
            });

            testData.push({
                cartItems: [{
                    price: 10,
                    quantity: 100
                }],
                totalPrice: 1000
            });

            testData.push({
                cartItems: [{
                    price: 12.2,
                    quantity: 3
                }],
                totalPrice: 36.6
            });

            for (let input of testData) {
                let totalPrice = parser.calcTotal(input.cartItems);
                expect(totalPrice).toBeCloseTo(input.totalPrice);
            }
        });
    });

    describe('CartParser - parseLine method tests', () => {
        const createCSVLine = (name, price, quantity) => {
            return `${name},${price},${quantity}`;
        };

        test('should return valid json object', () => {
            const testData = [];
            testData.push({
                name: 'some name',
                price: '10',
                quantity: '2'
            });
            testData.push({
                name: 'some name',
                price: '',
                quantity: ''
            });
            testData.push({
                name: 'some name',
                price: 10,
                quantity: 2
            });
            for (let input of testData) {
                const {name, price, quantity} = input;
                const testLine = createCSVLine(name, price, quantity);
                const jsonObj = parser.parseLine(testLine);
                expect(jsonObj).not.toBeUndefined();
                expect(jsonObj).not.toBeNull();
                expect(jsonObj.name).toBe(name);
                expect(jsonObj.price).toBe(Number(price));
                expect(jsonObj.quantity).toBe(Number(quantity));
                expect(jsonObj.id).toEqual(expect.any(String));
            }
        });

        test('should return NaN value for invalid numeric input', () => {
            const name = 'some name';
            const price = undefined;
            const quantity = null;
            const testLine = createCSVLine(name, price, quantity);
            const jsonObj = parser.parseLine(testLine);
            expect(jsonObj).not.toBeUndefined();
            expect(jsonObj).not.toBeNull();
            expect(jsonObj.name).toBe(name);
            expect(jsonObj.price).toBeNaN();
            expect(jsonObj.quantity).toBeNaN();
            expect(jsonObj.id).toEqual(expect.any(String));
        });

        test('should return empty object on empty line', () => {
            const testLine = createCSVLine();
            const jsonObj = parser.parseLine(testLine);
            expect(jsonObj).not.toBeUndefined();
            expect(jsonObj).not.toBeNull();
            expect(jsonObj.name).toBe('undefined');
            expect(jsonObj.price).toBeNaN();
            expect(jsonObj.quantity).toBeNaN();
            expect(jsonObj.id).toEqual(expect.any(String));
        });
    });


});

describe('CartParser - integration test', () => {
    it('should match generated json file', () => {
        const path = require('path');
        const csvPath = path.join(__dirname, '../samples/cart.csv');
        const jsonPath = path.join(__dirname, '../samples/cart.json');
        let json = parser.parse(csvPath);
        let expectedJson = JSON.parse(parser.readFile(jsonPath));

        let actualLength = json.items.length;
        let expectedLength = expectedJson.items.length;
        expect(actualLength).toBe(expectedLength);
        // verify all the cart items are the same (except the id, since it is generated randomly everytime)
        for (let i = 0; i < expectedLength; i++) {
            const actualItem = json.items[i];
            const expectedItem = expectedJson.items[i];
            expect(actualItem).toEqual({
                ...expectedItem,
                id: expect.any(String)
            });
        }

        // verify total price on both objects
        const actualTotalPrice = parser.calcTotal(json.items);
        const expectedTotalPrice = parser.calcTotal(expectedJson.items);
        expect(actualTotalPrice).toBeCloseTo(expectedTotalPrice);
        expect(actualTotalPrice).toBeCloseTo(json.total);
        expect(actualTotalPrice).toBeCloseTo(expectedJson.total);
    })
});
