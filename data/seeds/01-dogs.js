exports.seed = function (knex) {
    return knex("dogs").insert([
        { name: "Meleez", breed: "Australian Shepherd", age: 6 },
        { name: "York", breed: "Australian Shepherd", age: 2 },
        { name: "Lilo", breed: "Australian Shepherd", age: 4 },
        { name: "Bear", breed: "Wheaton Terrier", age: 12 },
    ]);
};
