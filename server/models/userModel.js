const users = [];

const addUser = (user) => {
    users.push(user);
};

const getUser = (email) => {
    return users.find(user => user.email === email);
};

const updateUser = (email, updateData) => {
    const userIndex = users.findIndex(user => user.email === email);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updateData };
    }
};

module.exports = { addUser, getUser, updateUser };
