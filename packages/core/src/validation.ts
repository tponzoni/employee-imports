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
  
  var date = new Date();
  var epoch = date.getTime();
  
  // converting back to date-time
  var whenModified = new Date(epoch);

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
        (item) => item?.employee?.empNo === employee.empNo,
      );

      if (isDuplicate) {
        errors.push(`Duplicate empNo detected at index`);
      }

      employee.PK = employee.empNo;
      employee.whenModified = whenModified;
      validatedItem.employee = employee;
    }

    if (employee.phNo) {
      // check if phNo is unique before accepting the request
      const isDuplicate = allItems.some((item) => {
        return item.employee?.phNo == employee.phNo;
      });

      if (isDuplicate) {
        errors.push(`Duplicate phNo detected at index`);
      }

      validatedItem.employee = employee;
    }

    // all items keep track of duplicates, by empNo or phNo
    allItems.push(validatedItem);

    // apply a filter to return only the desired items from the input
    if (filter == "all" || (filter == "valid" && errors.length == 0)) {
      filteredItems.push(validatedItem);
    } else if (filter == "errors" && errors.length > 0) {
      filteredItems.push(validatedItem);
    }
  }

  return filteredItems;
};
