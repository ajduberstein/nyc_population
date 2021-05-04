# from bisect import bisect
from ast import literal_eval
import geopandas as gpd

df = gpd.read_file("../src/counties.json")

f = open("../src/county-populations.json", "r")
d = literal_eval(f.read())
df["pop"] = df["id"].apply(lambda x: d[x])
df.set_index(df["id"], inplace=True)

# NY_POP = 8336817
#
# list_of_lists = []
# for nth_row, id in enumerate(df.id):
#     final_neighbors = []
#     neighbors = []
#     distances = []
#     self_geom = df[df["id"] == id]["geometry"].values[0].centroid
#     for _, row in df.iterrows():
#         other_geom = df[df["id"] == row["id"]]["geometry"].values[0].centroid
#         dist = self_geom.distance(other_geom)
#         idx = bisect(distances, dist)
#         distances.insert(idx, dist)
#         neighbors.insert(idx, row.id)
#     running_total_for_pop = 0
#     for n in neighbors:
#         other_pop = df[df["id"] == n]["pop"].values[0]
#         running_total_for_pop += other_pop
#         if running_total_for_pop >= NY_POP:
#             print(f"Found {len(final_neighbors)} for {id}")
#             break
#         final_neighbors.append(n)
#     list_of_lists.append(final_neighbors)
#
# df["neighbors"] = list_of_lists

geojson = df.to_json()
f.close()
fo = open("./source.geojson", "w")
fo.write(geojson)
fo.close()
