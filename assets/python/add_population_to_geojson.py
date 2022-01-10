import geopandas as gp
import pandas as pd
geojson = gp.read_file("../data/landkreise_edited.geojson")
#
# Load population data
population = pd.read_csv("../data/population_rki_age_groups.csv", encoding="cp1252",)
population = population.dropna()
population["ags"] = population["ags"].astype(int)
geojson["AGS_INT"] = geojson["AGS"].astype(int)

def get_population(row):
    s_ags = int(row["AGS_INT"])
    if (s_ags % 1000 == 0 and s_ags != 11000):
        print(s_ags)
        s_ags = s_ags // 1000
    selection = population.loc[population["ags"] == s_ags]
    row["A00-A04"] = int(selection["A00-A04"].values[0])
    row["A05-A14"] = int(selection["A05-A14"].values[0])
    row["A15-A34"] = int(selection["A15-A34"].values[0])
    row["A35-A59"] = int(selection["A35-A59"].values[0])
    row["A60-A79"] = int(selection["A60-A79"].values[0])
    row["A80+"] = int(selection["A80+"].values[0])
    row["total"] = row[["A00-A04","A05-A14","A15-A34","A35-A59","A60-A79","A80+"]].sum()
    return row

geojson = geojson.apply(get_population,axis=1,result_type="reduce")

geojson.to_file("../data/landkreise_edited.geojson", driver="GeoJSON")