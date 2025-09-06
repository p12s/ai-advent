// Large test file to verify streaming approach works
// This file has many lines to test memory-safe processing

function generateLargeContent() {
    console.log("This is a test function");
    
    // Simulate a large file with repetitive content
    for (let i = 0; i < 1000; i++) {
        console.log(`Processing item ${i} with some additional content to make lines longer`);
    }
    
    return "completed";
}

// Add more content to make this a substantial file
const data = {
    items: [],
    metadata: {
        created: new Date(),
        version: "1.0.0"
    }
};

for (let j = 0; j < 500; j++) {
    data.items.push({
        id: j,
        name: `Item ${j}`,
        description: `This is item number ${j} with detailed description`,
        tags: [`tag${j}`, `category${j % 10}`, "general"],
        properties: {
            active: j % 2 === 0,
            priority: j % 5,
            score: Math.random() * 100
        }
    });
}

module.exports = { generateLargeContent, data };
