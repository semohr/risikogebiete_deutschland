# ------------------------------------------------------------------------------ #
# We need to create a geojson file which is readable by amchart, also i want to remove some spacey vars
# @Author:        Sebastian B. Mohr
# @Email:
# @Created:       2020-10-16 17:23:55
# @Last Modified: 2020-10-16 18:17:57
# ------------------------------------------------------------------------------ #
import ujson
from decimal import *

n = 6


# Raw geo_file
with open("../data/landkreise_sim200.geo.json") as json_file:
    data = ujson.load(json_file)


for i, entry in enumerate(data["features"]):
    # Map AGS as ID for amchart
    props = entry["properties"]
    props["id"] = props["AGS"]

    if entry["geometry"]["type"] == "MultiPolygon":
        for i_a, a in enumerate(entry["geometry"]["coordinates"]):
            for i_b, b in enumerate(a):
                for i_c, c in enumerate(b):
                    for i_d, d in enumerate(c):
                        entry["geometry"]["coordinates"][i_a][i_b][i_c][i_d] = round(
                            d, n
                        )

    if entry["geometry"]["type"] == "Polygon":
        for i_a, a in enumerate(entry["geometry"]["coordinates"]):
            for i_b, b in enumerate(a):
                for i_c, c in enumerate(b):
                    entry["geometry"]["coordinates"][i_a][i_b][i_c] = round(c, n)

    # Delete some props to clean space
    ls_del = [
        "ADE",
        "GF",
        "BSG",
        "RS",
        "SDV_RS",
        "IBZ",
        "BEM",
        "NBD",
        "SN_L",
        "SN_R",
        "SN_K",
        "SN_V1",
        "SN_V2",
        "SN_G",
        "FK_S3",
        "NUTS",
        "RS_0",
        "AGS_0",
        "WSK",
    ]
    for key in ls_del:
        del props[key]


# Write file
with open("../data/minified_landkreise.geo.json", "w") as outfile:
    ujson.dump(data, outfile)
