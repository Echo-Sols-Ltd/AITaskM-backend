const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Department = require('../models/Department');
const Team = require('../models/Team');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Sample data
const sampleDepartments = [
  { name: 'Engineering', code: 'ENG', description: 'Software development and technical operations' },
  { name: 'Design', code: 'DES', description: 'UI/UX design and creative services' },
  { name: 'Product', code: 'PROD', description: 'Product management and strategy' },
  { name: 'Marketing', code: 'MKT', description: 'Marketing and communications' },
  { name: 'Sales', code: 'SALES', description: 'Sales and business development' }
];

const sampleTeams = [
  { name: 'Frontend Team', description: 'Frontend development team' },
  { name: 'Backend Team', description: 'Backend development team' },
  { name: 'Mobile Team', description: 'Mobile app development team' },
  { name: 'DevOps Team', description: 'Infrastructure and operations team' }
];

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@moveit.com',
    password: 'admin123',
    role: 'admin',
    position: 'System Administrator',
    avatar: 'https://via.placeholder.com/150/40b8a6/ffffff?text=A'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@moveit.com',
    password: 'password123',
    role: 'manager',
    position: 'Engineering Manager',
    avatar: 'https://via.placeholder.com/150/40b8a6/ffffff?text=S'
  },
  {
    name: 'Mike Chen',
    email: 'mike@moveit.com',
    password: 'password123',
    role: 'employee',
    position: 'Senior Developer',
    avatar: 'https://via.placeholder.com/150/40b8a6/ffffff?text=M'
  },
  {
    name: 'Emily Davis',
    email: 'emily@moveit.com',
    password: 'password123',
    role: 'employee',
    position: 'UI/UX Designer',
    avatar: 'https://via.placeholder.com/150/40b8a6/ffffff?text=E'
  }
];

const sampleProjects = [
  {
    name: 'MoveIt Platform',
    code: 'MOVEIT-001',
    description: 'AI-powered task management platform',
    status: 'active',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31')
  },
  {
    name: 'Mobile App',
    code: 'MOBILE-001',
    description: 'Mobile application for task management',
    status: 'planning',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-08-31')
  }
];

const sampleTasks = [
  {
    title: 'Design new landing page',
    description: 'Create wireframes and mockups for the new product landing page',
    priority: 'high',
    status: 'in_progress',
    progress: 65,
    estimatedHours: 16,
    actualHours: 10,
    complexity: 'moderate',
    risk: 'low'
  },
  {
    title: 'Implement user authentication',
    description: 'Set up OAuth2 and JWT token system for user login',
    priority: 'medium',
    status: 'pending',
    progress: 0,
    estimatedHours: 24,
    actualHours: 0,
    complexity: 'complex',
    risk: 'medium'
  },
  {
    title: 'Conduct user research interviews',
    description: 'Interview 10 potential users to gather feedback on the new feature',
    priority: 'low',
    status: 'completed',
    progress: 100,
    estimatedHours: 8,
    actualHours: 8,
    complexity: 'simple',
    risk: 'low'
  },
  {
    title: 'Optimize database queries',
    description: 'Review and optimize slow database queries in the analytics module',
    priority: 'high',
    status: 'in_progress',
    progress: 40,
    estimatedHours: 12,
    actualHours: 5,
    complexity: 'moderate',
    risk: 'medium'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-task-manager');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Team.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create departments
    const departments = await Department.insertMany(sampleDepartments);
    console.log(`✅ Created ${departments.length} departments`);

    // Create users with hashed passwords first
    const users = [];
    for (const userData of sampleUsers) {
      // const hashedPassword = await bcrypt.hash(userData.password, 10); # This generates logic failure cz there's pre-save hashing in User model 
      const user = new User({
        ...userData,
        password, // send password as raw cz it will be hashed on-save
        department: departments[0]._id // Assign to Engineering department
      });
      users.push(await user.save());
    }
    console.log(`✅ Created ${users.length} users`);

    // Create teams with managers (after users are created)
    const teams = [];
    for (let i = 0; i < sampleTeams.length; i++) {
      const teamData = sampleTeams[i];
      const manager = users.find(user => user.role === 'manager') || users[0]; // Use Sarah as manager or admin as fallback
      const team = new Team({
        ...teamData,
        manager: manager._id,
        department: departments[0]._id, // Assign to Engineering department
        members: [manager._id] // Add manager as first member
      });
      teams.push(await team.save());
    }
    console.log(`✅ Created ${teams.length} teams`);

    // Update users with team assignments
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (user.role === 'manager') {
        user.team = teams[0]._id; // Assign managers to Frontend team
      } else {
        user.team = teams[i % teams.length]._id; // Distribute other users across teams
      }
      await user.save();
    }
    console.log('✅ Updated user team assignments');

    // Create projects with managers (after users are created)
    const projects = [];
    for (let i = 0; i < sampleProjects.length; i++) {
      const projectData = sampleProjects[i];
      const manager = users.find(user => user.role === 'manager') || users[0]; // Use Sarah as manager or admin as fallback
      const project = new Project({
        ...projectData,
        manager: manager._id,
        team: teams[0]._id, // Assign to Frontend team
        department: departments[0]._id // Assign to Engineering department
      });
      projects.push(await project.save());
    }
    console.log(`✅ Created ${projects.length} projects`);

    // Create tasks with proper references
    const tasks = [];
    for (let i = 0; i < sampleTasks.length; i++) {
      const taskData = sampleTasks[i];
      const task = new Task({
        ...taskData,
        assignedTo: users[i % users.length]._id,
        assignedBy: users[0]._id, // Admin assigns all tasks
        project: projects[0]._id,
        team: teams[0]._id,
        department: departments[0]._id,
        deadline: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000) // 1 week intervals
      });
      tasks.push(await task.save());
    }
    console.log(`✅ Created ${tasks.length} tasks`);

    // Update user stats
    for (const user of users) {
      const userTasks = await Task.find({ assignedTo: user._id });
      const completedTasks = userTasks.filter(task => task.status === 'completed');
      
      user.stats.totalTasks = userTasks.length;
      user.stats.completedTasks = completedTasks.length;
      user.stats.totalPoints = completedTasks.length * 100; // 100 points per completed task
      await user.save();
    }
    console.log('✅ Updated user statistics');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Sample data created:');
    console.log(`   - ${departments.length} departments`);
    console.log(`   - ${teams.length} teams`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${projects.length} projects`);
    console.log(`   - ${tasks.length} tasks`);
    
    console.log('\n🔑 Default login credentials:');
    console.log('   Admin: admin@moveit.com / admin123');
    console.log('   User: sarah@moveit.com / password123');
    console.log('   User: mike@moveit.com / password123');
    console.log('   User: emily@moveit.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedDatabase();
