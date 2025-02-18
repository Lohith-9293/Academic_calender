let localHolidaysFromExcel = new Set();

// Function to read the uploaded Excel file
function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Assuming the dates are in the first column of the Excel sheet in dd/mm/yyyy format
        localHolidaysFromExcel = new Set(json.map(row => {
            const dateStr = row[0]; // Get the date string from the first column
            if (dateStr && typeof dateStr === 'string') {
                const [day, month, year] = dateStr.split('/'); // Split into day, month, year
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Convert to yyyy-mm-dd format
            }
            return null;
        }).filter(date => date)); // Filter out invalid dates
    };
    reader.readAsArrayBuffer(file);
}

// Event listener for file input
document.getElementById('localHolidaysFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        readExcelFile(file);
    }
});

function generateTable() {
    const startDate = new Date(document.getElementById("startDate").value);
    const endDate = new Date(document.getElementById("endDate").value);

    const dussehraStart = new Date(document.getElementById("dussehraStart").value);
    const dussehraEnd = new Date(document.getElementById("dussehraEnd").value);
    const pongalStart = new Date(document.getElementById("pongalStart").value);
    const pongalEnd = new Date(document.getElementById("pongalEnd").value);

    const allHolidays = new Set([...localHolidaysFromExcel]);
    addDateRangeToSet(dussehraStart, dussehraEnd, allHolidays);
    addDateRangeToSet(pongalStart, pongalEnd, allHolidays);

    const tableBody = document.querySelector("#calendar tbody");
    tableBody.innerHTML = "";

    let currentDate = new Date(startDate);
    let currentMonth = currentDate.getMonth();
    let firstDayOfWeek = currentDate.getDay();
    let weekNo = 1;

    let monthRow = document.createElement("tr");
    let monthCell = document.createElement("td");
    monthCell.colSpan = 9;
    monthCell.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthCell.classList.add("month-row");
    monthRow.appendChild(monthCell);
    tableBody.appendChild(monthRow);

    let row = document.createElement("tr");
    let weekCell = document.createElement("td");
    weekCell.textContent = weekNo;
    row.appendChild(weekCell);

    let workingDaysCell = document.createElement("td");
    let workingDaysCount = 0;
    row.appendChild(workingDaysCell);

    for (let i = 0; i < firstDayOfWeek; i++) {
        let emptyCell = document.createElement("td");
        emptyCell.classList.add("empty");
        row.appendChild(emptyCell);
    }

    let hasDatesInWeek = false;

    while (currentDate <= endDate) {
        let dayOfWeek = currentDate.getDay();
        let dateKey = currentDate.toISOString().split('T')[0]; // Format as yyyy-mm-dd

        if (currentDate.getDate() === 1 && currentDate.getMonth() !== currentMonth) {
            workingDaysCell.textContent = workingDaysCount;
            tableBody.appendChild(row);

            row = document.createElement("tr");

            let newMonthRow = document.createElement("tr");
            let newMonthCell = document.createElement("td");
            newMonthCell.colSpan = 9;
            newMonthCell.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            newMonthCell.classList.add("month-row");
            newMonthRow.appendChild(newMonthCell);
            tableBody.appendChild(newMonthRow);

            if (!hasDatesInWeek) {
                weekNo--;
            }

            weekNo++;
            weekCell = document.createElement("td");
            weekCell.textContent = weekNo;
            row.appendChild(weekCell);

            workingDaysCell = document.createElement("td");
            workingDaysCount = 0;
            row.appendChild(workingDaysCell);

            let newMonthStartDay = currentDate.getDay();
            for (let i = 0; i < newMonthStartDay; i++) {
                let emptyCell = document.createElement("td");
                emptyCell.classList.add("empty");
                row.appendChild(emptyCell);
            }

            currentMonth = currentDate.getMonth();
            hasDatesInWeek = false;
        }

        let cell = document.createElement("td");
        cell.textContent = currentDate.getDate();

        if (allHolidays.has(dateKey) || dayOfWeek === 0 || isSecondSaturday(currentDate)) {
            cell.classList.add("holiday");
        } else {
            workingDaysCount++;
        }

        row.appendChild(cell);
        hasDatesInWeek = true;

        if (dayOfWeek === 6) {
            workingDaysCell.textContent = workingDaysCount;
            tableBody.appendChild(row);

            if (!hasDatesInWeek) {
                weekNo--;
            }

            weekNo++;
            row = document.createElement("tr");
            weekCell = document.createElement("td");
            weekCell.textContent = weekNo;
            row.appendChild(weekCell);

            workingDaysCell = document.createElement("td");
            workingDaysCount = 0;
            row.appendChild(workingDaysCell);

            hasDatesInWeek = false;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    workingDaysCell.textContent = workingDaysCount;
    tableBody.appendChild(row);
}

function addDateRangeToSet(start, end, set) {
    while (start <= end) {
        set.add(start.toISOString().split('T')[0]); // Format as yyyy-mm-dd
        start.setDate(start.getDate() + 1);
    }
}

function isSecondSaturday(date) {
    return date.getDay() === 6 && Math.ceil(date.getDate() / 7) === 2;
}

// Function to count total working days
function countWorkingDays() {
    const workingDaysCells = document.querySelectorAll("#calendar tbody td:nth-child(2)");
    let totalWorkingDays = 0;
    workingDaysCells.forEach(cell => {
        totalWorkingDays += parseInt(cell.textContent) || 0;
    });
    alert(`Total Working Days: ${totalWorkingDays}`);
}

// Function to download the table as Excel (.xlsx)
function downloadExcel() {
    const table = document.getElementById("calendar");
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(workbook, "Academic_Calendar.xlsx");
}

// Function to download the table as PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");

    const table = document.getElementById("calendar");
    const rows = table.querySelectorAll("tr");
    const data = [];
    const styles = [];

    rows.forEach((row, rowIndex) => {
        const rowData = [];
        const rowStyles = [];
        row.querySelectorAll("th, td").forEach((cell, colIndex) => {
            rowData.push(cell.textContent);

            if (cell.classList.contains("month-row")) {
                rowStyles.push({ fillColor: [173, 216, 230], textColor: [0, 0, 0] });
            } else if (cell.classList.contains("holiday")) {
                rowStyles.push({ fillColor: [255, 0, 0], textColor: [255, 255, 255] });
            } else if (cell.classList.contains("empty")) {
                rowStyles.push({ fillColor: [249, 249, 249], textColor: [0, 0, 0] });
            } else {
                rowStyles.push({ fillColor: [255, 255, 255], textColor: [0, 0, 0] });
            }
        });
        data.push(rowData);
        styles.push(rowStyles);
    });

    doc.autoTable({
        head: [data[0]],
        body: data.slice(1),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
        bodyStyles: styles.slice(1),
        margin: { top: 10 },
        tableWidth: "auto",
    });

    doc.save("Academic_Calendar.pdf");
}

function downloadWeekAndWorkingDaysExcel() {
    const table = document.getElementById("calendar");
    const rows = table.querySelectorAll("tbody tr");
    const data = [];

    // Extract Week No and Working Days
    rows.forEach(row => {
        const weekNoCell = row.querySelector("td:nth-child(1)");
        const workingDaysCell = row.querySelector("td:nth-child(2)");

        if (weekNoCell && workingDaysCell) {
            const weekNo = weekNoCell.textContent.trim();
            const workingDays = parseInt(workingDaysCell.textContent.trim(), 10);

            // Only add rows where Week No and Working Days are valid
            if (weekNo && !isNaN(workingDays)) {
                data.push({ weekNumber: weekNo, workingDays: workingDays });
            }
        }
    });

    // Remove duplicates where 'Working Days' is 0
    const uniqueData = [];
    const seenWeeks = new Set();

    data.forEach(row => {
        if (!seenWeeks.has(row.weekNumber)) {
            // If the week number is not seen before, add it to the uniqueData array
            uniqueData.push(row);
            seenWeeks.add(row.weekNumber); // Mark this week number as seen
        } else {
            // If the week number is already seen, check if the existing entry has 0 working days
            const existingRowIndex = uniqueData.findIndex(item => item.weekNumber === row.weekNumber);
            if (existingRowIndex !== -1) {
                // If the existing entry has 0 working days, replace it with the new row
                if (uniqueData[existingRowIndex].workingDays === 0 && row.workingDays !== 0) {
                    uniqueData[existingRowIndex] = row; // Replace with the new row
                }
                // If both the existing and new rows have 0 working days, do nothing (keep the existing row)
            }
        }
    });

    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(uniqueData);

    // Create workbook and append worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Week Data");

    // Trigger download
    XLSX.writeFile(wb, "Week_WorkingDays.xlsx");
}
