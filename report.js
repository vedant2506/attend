// *** PASTE THE SAME SUPABASE DETAILS FROM YOUR OTHER SCRIPT.JS FILE ***
const SUPABASE_URL = 'https://hrshatipygqtlqtjkozm.supabase.co';      // <-- PASTE YOUR URL HERE
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc2hhdGlweWdxdGxxdGprb3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Njc5MDIsImV4cCI6MjA3NTI0MzkwMn0.KKzsKiBOO9AlQqX-ickVMBA9qXexF-cgiVeMVFcF26M'; // <-- PASTE YOUR ANON KEY HERE

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Get DOM Elements ---
const loadingMessageEl = document.getElementById('loading-message');
const presentListEl = document.getElementById('present-list');
const totalPresentEl = document.getElementById('total-present');

/**
 * This function runs as soon as the page loads.
 * It fetches all records from the 'records' table in Supabase.
 */
async function fetchAttendanceRecords() {
    // 1. Fetch all records from the 'records' table, selecting only the 'roll_no'
    //    and ordering them numerically to make the list easy to read.
    const { data, error } = await db
        .from('records')
        .select('roll_no')
        .order('roll_no', { ascending: true });

    // 2. Handle any errors
    if (error) {
        console.error('Error fetching records:', error);
        loadingMessageEl.textContent = 'Error: Could not fetch records from the database.';
        loadingMessageEl.style.color = '#ef4444'; // Make the error message red
        return;
    }

    // 3. If fetching was successful, hide the loading message
    loadingMessageEl.style.display = 'none';

    // 4. Display the total count
    totalPresentEl.textContent = data.length;

    // 5. Check if any records were found
    if (data.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No attendance records found for this session.';
        presentListEl.appendChild(li);
        return;
    }

    // 6. Loop through the data and display each roll number
    data.forEach(record => {
        const li = document.createElement('li');
        li.textContent = `Roll No: ${record.roll_no}`;
        presentListEl.appendChild(li);
    });
}

// Run the fetch function when the page is fully loaded
window.onload = fetchAttendanceRecords;