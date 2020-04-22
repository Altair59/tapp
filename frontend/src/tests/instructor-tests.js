import PropTypes from "prop-types";
import {
    addSession,
    deleteSession,
    addPosition,
    deletePosition,
    checkPropTypes,
    instructorPropTypes,
    expect,
    it,
    beforeAll,
    afterAll,
    toMatchSuccessDebug
} from "./utils";

export function instructorsTests({ apiGET, apiPOST }) {
    let session = null,
        position = null,
        instructor = null;
    // set up a session to be available before tests run
    beforeAll(async () => {
        // this session will be available for all tests
        session = await addSession({ apiGET, apiPOST });
        position = await addPosition({ apiGET, apiPOST }, session);
    });
    // delete the session after the tests run
    afterAll(async () => {
        await deletePosition({ apiGET, apiPOST }, position);
        await deleteSession({ apiGET, apiPOST }, session);
    });

    it("create instructor", async () => {
        const newInstructorData = {
            first_name: "Anand",
            last_name: "Liu",
            email: "anand.liu.sample@utoronto.ca",
            utorid: "anandl"
        };

        // create a new instructor
        const resp1 = await apiPOST(`/instructors`, newInstructorData);
        toMatchSuccessDebug(resp1);
        expect(resp1.payload).toMatchObject(newInstructorData);

        // make sure instructor is on instructor list
        const resp2 = await apiGET(`/instructors`);
        toMatchSuccessDebug(resp2);
        expect(resp2.payload).toContainObject(newInstructorData);

        // set instructor to used by later test
        instructor = resp1.payload;
    });

    it("get instructors", async () => {
        const resp = await apiGET("/instructors");
        toMatchSuccessDebug(resp);
        checkPropTypes(PropTypes.arrayOf(instructorPropTypes), resp.payload);
    });

    it("update an instructor", async () => {
        const updateInstructorData = {
            id: instructor.id,
            email: "anand.liu@gmail.com"
        };

        // update the instructor
        const resp = await apiPOST(`/instructors`, updateInstructorData);
        toMatchSuccessDebug(resp);
        expect(resp.payload).toMatchObject(updateInstructorData);
    });

    // delete an instructor
    it("delete instructor", async () => {
        const resp1 = await apiPOST(`/instructors/delete`, instructor);
        expect(resp1).toMatchObject({
            status: "success",
            payload: { id: instructor.id }
        });

        // make sure the instructor is deleted
        const resp2 = await apiGET("/instructors");
        toMatchSuccessDebug(resp2);
        checkPropTypes(PropTypes.arrayOf(instructorPropTypes), resp2.payload);
        expect(resp2).not.toContainObject(instructor);
    });

    it.todo("fail to delete instructor from a position with invalid id");
}
