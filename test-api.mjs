import fetch from 'node-fetch';

const url = 'https://syqccjkbalpqpzzkblws.supabase.co/rest/v1/BOA-Log?id=lt.3609&select=id';
const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cWNjamtiYWxwcXB6emtibHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDY0NDUsImV4cCI6MjA5ODY4MjQ0NX0.pd8dc3OmgIZuWL_w_EOajB_AGbtfylw-nfSSkT7I4Wg'
  }
};

try {
  const res = await fetch(url, options);
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Count:', data.length);
  if (data.length > 0) console.log('First 3 IDs:', data.slice(0, 3).map(e => e.id).join(', '));
} catch (e) {
  console.error('Error:', e.message);
}
