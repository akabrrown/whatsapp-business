import fetch from 'node-fetch'; // if available, else we can use node's native fetch (Node 18+)

async function test() {
  const res = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kukua@roseanddenim.com', password: 'password123' })
  });
  const data = await res.json();
  const token = data.token;
  
  const res2 = await fetch('http://localhost:4000/api/admin/categories', {
    headers: { 'Cookie': `ownerToken=${token}` }
  });
  const data2 = await res2.json();
  console.log(JSON.stringify(data2.categories, null, 2));
}

test();
