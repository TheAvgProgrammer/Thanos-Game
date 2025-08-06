// src/data/dummyData.js
export const sampleUsers = [
  "Ravi", "Anya", "John", "Leena", "Kiran",
  "Maya", "Zed", "Aditi", "Hiro", "Rita"
];

export function getRandomTask() {
  const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
  const damage = Math.floor(Math.random() * 100) + 50;
  return { user, damage };
}
