export interface Employee {
  empNo: string;
  firstName: string;
  lastName: string;
  phNo?: string;
}

export interface ValidatedItem {
  index: number;
  errors?: string[];
  employee?: Employee;
}

export type GroupedErrors = {
  [error: string]: number[];
};

/**
 * Validates each element in the JSON array against the Employee interface. Also checks for duplicates in the provided array.
 * @param employees - The JSON object containing an array of potential employee objects.
 * @returns An array of ValidationItem objects indicating whether each employee element is valid or not.
 */
export const validateEmployees = (
  employees: any[],
  filter?: string,
): ValidatedItem[] => {
  const allItems: ValidatedItem[] = [];
  const filteredItems: ValidatedItem[] = [];

  console.log("Validating employees payload");

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const errors: string[] = [];

    if (!employee.empNo) {
      errors.push(`empNo is missing or empty`);
    }

    if (!employee.firstName) {
      errors.push(`firstName is missing or empty`);
    }

    if (!employee.lastName) {
      errors.push(`lastName is missing or empty`);
    }

    // validated does not mean valid, just means has gone through basic parsing
    const validatedItem: ValidatedItem = { index: i, errors: errors };

    if (employee.empNo) {

      // check if empNo is unique before adding
      const isDuplicate = allItems.some(
        (item) => item?.employee?.empNo === employee.empNo
      );

      if (isDuplicate) {

        errors.push(
          `Duplicate empNo detected at index`,
        );
      }
      else {
        validatedItem.employee = employee;
      }
    }

    if (employee.phNo) {

      // check if empNo is unique before adding
      const isDuplicate = allItems.some(
        (item) => item?.employee?.phNo && item?.employee?.phNo == employee.phNo
      );

      if (isDuplicate) {

        errors.push(
          `Duplicate phNo detected at index`,
        );
      }
      else {
        validatedItem.employee = employee;
      }
    }
    
    allItems.push(validatedItem);

    console.log("allItems", allItems);

    if (filter == "all" || (filter == "valid" && errors.length == 0)) {
      console.log("here 3");

      filteredItems.push(validatedItem);
    } else if (filter == "errors" && errors.length > 0) {
      console.log("here 4");

      filteredItems.push(validatedItem);
    }
  }

  console.log("filteredItems", filteredItems);

  return filteredItems;
};
