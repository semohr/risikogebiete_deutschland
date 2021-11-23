var h5_data
var h5_age_groups_label
var h5_age_groups_value
fetch("./assets/data/test2.hdf5")
    .then(function (response) {
        console.log(response)
        return response.arrayBuffer()
    })
    .then(function (buffer) {
        var f = new hdf5.File(buffer, "test2.hdf5");
        console.log(f)
        h5_data = {
            date: f.get('data/date').value,
            IdLandkreis: f.get('data/IdLandkreis').value,
            Altersgruppe: f.get('data/Altersgruppe').value,
            inzidenz: f.get('data/inzidenz').value,
            weekly_cases: f.get('data/weekly_cases').value,
        }
        h5_age_groups_label = f.get('age_groups_label').value;
        h5_age_groups_value = f.get('age_groups_value').value;
    });
