/**
 * @jest-environment node
 */
import { describe, it, expect } from "./utils";
import {
    validate,
    SpreadsheetRowMapper,
    normalizeImport,
} from "../libs/importExportUtils";
import { prepareMinimal } from "../libs/exportUtils";
import XLSX from "xlsx";
import instructorsJSON from "./samples/instructors.json";
import applicantsJSON from "./samples/applicants.json";

/* eslint-env node */
var FileAPI = require("file-api"),
    File = FileAPI.File;

// object JSON collections
const objectJSON = {
    instructor: instructorsJSON,
    applicant: applicantsJSON,
};

// Run the actual tests for both the API and the Mock API
describe("Import/export library functionality", () => {
    const instructorSchema = {
        keys: ["first_name", "last_name", "utorid", "email"],
        keyMap: {
            "First Name": "first_name",
            "Given Name": "first_name",
            First: "first_name",
            "Last Name": "last_name",
            Surname: "last_name",
            "Family Name": "last_name",
            Last: "last_name",
        },
        requiredKeys: ["utorid"],
        primaryKey: "utorid",
    };

    const applicantSchema = {
        keys: [
            "first_name",
            "last_name",
            "utorid",
            "email",
            "student_number",
            "phone",
        ],
        keyMap: {
            "First Name": "first_name",
            "Given Name": "first_name",
            First: "first_name",
            "Last Name": "last_name",
            Surname: "last_name",
            "Family Name": "last_name",
            Last: "last_name",
            "Student Number": "student_number",
        },
        requiredKeys: ["utorid"],
        primaryKey: "utorid",
    };

    const instructorData = [
        {
            id: 2,
            first_name: "Henry",
            last_name: "Smith",
            email: "hery.smith@utoronto.ca",
            utorid: "smithh",
        },
        {
            id: 3,
            first_name: "Emily",
            last_name: "Garcia",
            email: "emily.garcia@utoronto.ca",
            utorid: "garciae",
        },
        {
            first_name: "Megan",
            last_name: "Miller",
            email: "megan.miller@utoronto.ca",
            utorid: "millerm",
        },
    ];

    const applicantData = [
        {
            first_name: "Celinda",
            last_name: "Najara",
            utorid: "cnajara0",
            email: "cnajara0@ycombinator.com",
            student_number: 5876,
            phone: "236-361-6762",
        },
        {
            first_name: "Sumner",
            last_name: "Silbersak",
            utorid: "ssilbersak1",
            email: "ssilbersak1@goo.gl",
            student_number: 7066,
            phone: "124-215-0134",
        },
        {
            first_name: "Creight",
            last_name: "Willingale",
            utorid: "cwillingale2",
            email: "cwillingale2@google.de",
            student_number: 263,
            phone: "835-889-7339",
        },
    ];

    /*
     *  Create a `File` object containing of the specified format.
     * This function is a copy of function dataToFile in ../libs/importExportUtils.
     * The only difference is this function returns a FileAPI File object but not a File object.
     * The reason is Jest is running on NodeJS which does not support File object, and the file-apis File object has a different constructor with File.
     * By calling this function only for testing, the app's export functionality will not be affected,
     * while the test can still test the export functionality.
     *
     * @param {{toSpreadsheet: func, toJson: func}} formatters - Formatters return an array of objects (usable as spreadsheet rows) or a javascript object to be passed to JSON.stringify
     * @param {"xlsx" | "csv" | "json"} dataFormat
     * @param {string} filePrefix
     * @returns {FileAPI.File}
     */
    function dataToFileForTest(formatters, dataFormat, filePrefix = "") {
        const fileName = `${filePrefix}${
            filePrefix ? "_" : ""
        }export_${new Date().toLocaleDateString("en-CA", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
        })}`;

        if (dataFormat === "spreadsheet" || dataFormat === "csv") {
            const workbook = XLSX.utils.book_new();
            const sheet = XLSX.utils.aoa_to_sheet(formatters.toSpreadsheet());
            XLSX.utils.book_append_sheet(workbook, sheet, "Instructors");

            const bookType = dataFormat === "csv" ? "csv" : "xlsx";

            // We convert the data into a blob and return it so that it can be downloaded
            // by the user's browser
            const file = new File({
                buffer: [XLSX.write(workbook, { type: "array", bookType })],
                name: `${fileName}.${bookType}`,
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            return file;
        }

        if (dataFormat === "json") {
            const file = new File({
                buffer: [JSON.stringify(formatters.toJson(), null, 4)],
                name: `${fileName}.json`,
                type: "application/json",
            });
            return file;
        }

        throw new Error(
            `Cannot process data to format "${dataFormat}"; try "spreadsheet" or "json".`
        );
    }

    /*
     * Construct a FileAPI `File` object based on pre-defined object data and input file type
     *
     * @param {"xlsx" | "csv" | "json"} dataFormat
     * @returns {FileAPI.File}
     */
    function getInstructorsDataFile(dataFormat) {
        return dataToFileForTest(
            {
                toSpreadsheet: () =>
                    [["Last Name", "First Name", "UTORid", "email"]].concat(
                        instructorData.map((instructor) => [
                            instructor.last_name,
                            instructor.first_name,
                            instructor.utorid,
                            instructor.email,
                        ])
                    ),
                toJson: () => ({
                    instructors: instructorData.map((instructor) =>
                        prepareMinimal.instructor(instructor)
                    ),
                }),
            },
            dataFormat,
            "instructors"
        );
    }

    function testImportFromFile(objectData, objectType, objectSchema) {
        const correctData = objectData.map((object) =>
            prepareMinimal[objectType](object)
        );

        // import object data from a JSON file
        expect(objectJSON[objectType][`${objectType}s`]).toEqual(correctData);

        // import object data from a CSV File
        const workbook1 = XLSX.readFile(
            __dirname + `/samples/${objectType}s.csv`
        );
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        let dataCSV = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
        // transform to array of objects
        const keys1 = dataCSV.shift();
        dataCSV = dataCSV.map(function (row) {
            return keys1.reduce(function (obj, key, i) {
                obj[key] = row[i];
                return obj;
            }, {});
        });
        const resultCSV = normalizeImport(
            {
                fileType: "spreadsheet",
                data: dataCSV,
            },
            objectSchema
        );
        expect(resultCSV).toEqual(correctData);
    }

    it("Validate data according to a schema", () => {
        // Should not throw
        expect(() => validate(instructorData, instructorSchema)).not.toThrow(
            Error
        );
        // Should throw
        expect(() =>
            validate(
                [
                    ...instructorData,
                    { first_name: "You", last_name: "Me", email: "t@b.com" },
                ],
                instructorSchema
            )
        ).toThrow(Error);
    });

    it("Fuzzy matching of spreadsheet column names based on schema", () => {
        let rowMapper;
        const targetData = { first_name: "Joe", last_name: "Smith" };

        // Matches keys specified in the schema
        // `rowMapper` needs to be redefined each time it is used with different column names because of the way it caches lookups
        rowMapper = new SpreadsheetRowMapper(instructorSchema);
        expect(
            rowMapper.formatRow(
                { first_name: "Joe", last_name: "Smith" },
                false
            )
        ).toEqual(targetData);

        // Matches keys specified in the keyMap
        rowMapper = new SpreadsheetRowMapper(instructorSchema);
        expect(
            rowMapper.formatRow(
                { "First Name": "Joe", "Last Name": "Smith" },
                false
            )
        ).toEqual(targetData);

        // Fuzzy matches
        rowMapper = new SpreadsheetRowMapper(instructorSchema);
        expect(
            rowMapper.formatRow(
                { "First  Name": "Joe", LastName: "Smith" },
                false
            )
        ).toEqual(targetData);
        rowMapper = new SpreadsheetRowMapper(instructorSchema);
        expect(
            rowMapper.formatRow(
                { firstname: "Joe", "LAST NAMEE": "Smith" },
                false
            )
        ).toEqual(targetData);

        // Fails to match column names that are too far different from the original
        rowMapper = new SpreadsheetRowMapper(instructorSchema);
        expect(
            rowMapper.formatRow({ name: "Joe", "LAST NAME": "Smith" }, false)
        ).not.toEqual(targetData);
    });

    it("Export data to a JSON/CSV/XLSX", () => {
        // export instructor data a CSV File object
        const fileCSV = getInstructorsDataFile("csv");
        expect(fileCSV.name).toEqual(
            `instructors_export_${new Date().toLocaleDateString("en-CA", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
            })}.csv`
        );

        // export instructor data to a JSON File object
        const fileJSON = getInstructorsDataFile("json");
        expect(fileJSON.name).toEqual(
            `instructors_export_${new Date().toLocaleDateString("en-CA", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
            })}.json`
        );

        // export instructor data to a XLSX File object
        const fileXLSX = getInstructorsDataFile("spreadsheet");
        expect(fileXLSX.name).toEqual(
            `instructors_export_${new Date().toLocaleDateString("en-CA", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
            })}.xlsx`
        );

        // invalid file type, should throw error
        expect(() => getInstructorsDataFile("nonsense")).toThrow(Error);

        const resultCorrect = instructorData.map((instructor) =>
            prepareMinimal.instructor(instructor)
        );

        // import instructor data from a JSON File object
        const dataJSON = JSON.parse(fileJSON.buffer.toString()).instructors;
        const resultJSON = normalizeImport(
            {
                fileType: "json",
                data: dataJSON,
            },
            instructorSchema
        );
        expect(resultJSON).toEqual(resultCorrect);

        // import instructor data from a XLSX File object
        const workbook = XLSX.read(fileXLSX.buffer[0], { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        let dataXLSX = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // transform to array of objects
        const keys = dataXLSX.shift();
        dataXLSX = dataXLSX.map(function (row) {
            return keys.reduce(function (obj, key, i) {
                obj[key] = row[i];
                return obj;
            }, {});
        });
        const resultXLSX = normalizeImport(
            {
                fileType: "spreadsheet",
                data: dataXLSX,
            },
            instructorSchema
        );
        expect(resultXLSX).toEqual(resultCorrect);

        // import instructor data from a CSV File object
        const workbook1 = XLSX.read(fileCSV.buffer[0], { type: "array" });
        const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
        let dataCSV = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
        // transform to array of objects
        const keys1 = dataCSV.shift();
        dataCSV = dataCSV.map(function (row) {
            return keys1.reduce(function (obj, key, i) {
                obj[key] = row[i];
                return obj;
            }, {});
        });
        const resultCSV = normalizeImport(
            {
                fileType: "spreadsheet",
                data: dataCSV,
            },
            instructorSchema
        );
        expect(resultCSV).toEqual(resultCorrect);
    });

    it("Import instructor data from a JSON/CSV/XLSX", () => {
        testImportFromFile(instructorData, "instructor", instructorSchema);
    });

    it("Import applicant data from a JSON/CSV/XLSX", () => {
        testImportFromFile(applicantData, "applicant", applicantSchema);
    });
});
