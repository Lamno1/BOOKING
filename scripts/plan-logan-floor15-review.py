"""One-floor feasibility study, not a room catalog migration.
Explicit walls, net areas, doors, sanitary/bed envelopes and 1 m route probes.
"""
import json,math,heapq,html
from pathlib import Path
from itertools import combinations
import cairosvg
from shapely.geometry import Polygon,Point,LineString,box,mapping
from shapely.ops import unary_union,nearest_points
from shapely.affinity import rotate,translate

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/logan-b-review-02';OUT.mkdir(exist_ok=True,parents=True)
B=json.loads((ROOT/'assets/logan-option-b/geometry-review.json').read_text())
M=json.loads((ROOT/'assets/architecture-transfer/logan-tidal-source.manifest.json').read_text())
glass=Polygon(B['floor15GlazingPolygon']);slab=Polygon(B['floor15SlabPolygon'])
core=box(14,3,26,17);hall_outer=box(8.5,-2,31.5,22)
hall=hall_outer.difference(core.buffer(.12,join_style=2))
targets={1:(84,24),2:(90,30),3:(60,12),4:(60,12),5:(60,12),6:(66,18),7:(66,18),8:(90,30)}
degrees={1:180,2:135,3:90,4:45,5:0,6:-45,7:-90,8:-142}
def polygons(g):return [g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon']
def lines(g):return [g] if g.geom_type=='LineString' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='LineString']
def polydata(g):return [dict(shell=list(p.exterior.coords),holes=[list(i.coords) for i in p.interiors]) for p in polygons(g)]
def coords(p):return [float(p.x),float(p.y)]
def wedge(deg,width):
    return Polygon([(20,10)]+[(20+80*math.cos(math.radians(deg-width/2+width*i/96)),10+80*math.sin(math.radians(deg-width/2+width*i/96))) for i in range(97)]+[(20,10)])
def local(g,deg,inverse=False):
    if inverse:return rotate(translate(g,xoff=-20,yoff=-10),-deg,origin=(0,0))
    return translate(rotate(g,deg,origin=(0,0)),xoff=20,yoff=10)
def worldpoint(u,v,deg):return coords(local(Point(u,v),deg))
def make_entry(gross,old):
    choices=[]
    for seg in lines(gross.boundary.intersection(hall_outer.boundary)):
        if seg.length<1.6:continue
        d=min(seg.length-.8,max(.8,seg.project(Point(old))))
        for candidate in [d,d-.4,d+.4,d-.8,d+.8,seg.length/2]:
            if not .8<=candidate<=seg.length-.8:continue
            p=seg.interpolate(candidate);a=seg.interpolate(candidate-.55);b=seg.interpolate(candidate+.55)
            n=(-1,0) if abs(p.x-8.5)<1e-5 else ((1,0) if abs(p.x-31.5)<1e-5 else ((0,1) if abs(p.y-22)<1e-5 else (0,-1)))
            start=Point(p.x+n[0]*.85,p.y+n[1]*.85)
            if gross.buffer(-.74,join_style=2).covers(start):choices.append((p.distance(Point(old)),p,a,b))
    if not choices:raise ValueError('No straight 1.1 m entry frontage')
    shift,p,a,b=min(choices,key=lambda x:x[0])
    x,y=p.x,p.y
    normal=(-1,0) if abs(x-8.5)<1e-5 else ((1,0) if abs(x-31.5)<1e-5 else ((0,1) if abs(y-22)<1e-5 else (0,-1)))
    return dict(point=coords(p),ends=[coords(a),coords(b)],width=1.1,normal=normal,old=old,shift=shift)
def route_path(clear,start,end,step=.35):
    # Tests a one-metre diameter moving disc in clear floor, not fire-code compliance.
    space=clear.buffer(-.50,join_style=2)
    s=Point(start);e=Point(end)
    if not space.covers(s) or not space.covers(e):return None
    components=polygons(space)
    component=next((p for p in components if p.covers(s) and p.covers(e)),None)
    if component is None:return None
    xmin,ymin,xmax,ymax=component.bounds
    nx=math.ceil((xmax-xmin)/step)+1;ny=math.ceil((ymax-ymin)/step)+1
    def pos(n):return (xmin+n[0]*step,ymin+n[1]*step)
    valid={}
    def ok(n):
        if n not in valid:valid[n]=0<=n[0]<nx and 0<=n[1]<ny and component.covers(Point(pos(n)))
        return valid[n]
    def nearest(p):
        x=round((p[0]-xmin)/step);y=round((p[1]-ymin)/step)
        options=[(i,j) for i in range(x-3,x+4) for j in range(y-3,y+4) if ok((i,j)) and component.covers(LineString([p,pos((i,j))]))]
        return min(options,key=lambda n:math.dist(p,pos(n))) if options else None
    first,last=nearest(start),nearest(end)
    if first is None or last is None:return None
    queue=[(0,first)];cost={first:0};parent={}
    while queue:
        _,n=heapq.heappop(queue)
        if n==last:
            nodes=[n]
            while n in parent:n=parent[n];nodes.append(n)
            path=[start]+[pos(v) for v in reversed(nodes)]+[end]
            # Greedy visibility simplification within the eroded free space.
            simplified=[path[0]];i=0
            while i<len(path)-1:
                j=len(path)-1
                while j>i+1 and not component.covers(LineString([path[i],path[j]])):j-=1
                simplified.append(path[j]);i=j
            return simplified
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
            q=(n[0]+dx,n[1]+dy)
            if not ok(q) or not component.covers(LineString([pos(n),pos(q)])):continue
            nc=cost[n]+math.hypot(dx,dy)
            if nc<cost.get(q,1e9):cost[q]=nc;parent[q]=n;heapq.heappush(queue,(nc+math.dist(q,last),q))
    return None

rooms=[];failures=[]
for slot,deg in degrees.items():
    desired,bal_target=targets[slot]
    low,high=8,70
    for _ in range(48):
        mid=(low+high)/2;g=glass.intersection(wedge(deg,mid)).difference(hall_outer)
        if g.buffer(-.24,join_style=2).area<desired+1.25:low=mid
        else:high=mid
    width=(low+high)/2;w=wedge(deg,width)
    gross=glass.intersection(w).difference(hall_outer);base=gross.buffer(-.24,join_style=2)
    roomid=f'TS-15{slot:02}'
    olddoor=next(p['sourcePosition'][:2] for p in M['markers'] if p['name']=='DOOR_'+roomid)
    entry=make_entry(gross,olddoor)
    ray=LineString([(20,10),worldpoint(80,0,deg)])
    bp=glass.boundary.intersection(ray)
    if bp.geom_type!='Point':raise ValueError('Invalid facade intersection')
    bc=coords(bp);uvec=(math.cos(math.radians(deg)),math.sin(math.radians(deg)))
    start=[entry['point'][i]+entry['normal'][i]*.85 for i in range(2)]
    end=[bc[i]-uvec[i]*.9 for i in range(2)]
    # Keep a dedicated terrace strip, with remaining deck classified separately.
    lo,hi=.2,5;bw=wedge(deg,width+3)
    for _ in range(44):
        d=(lo+hi)/2
        balcony=glass.buffer(d,join_style=2).intersection(slab.buffer(-.12)).intersection(bw).difference(glass.buffer(.12)).buffer(-.06,join_style=2)
        if balcony.area<bal_target:lo=d
        else:hi=d
    balcony_depth=(lo+hi)/2
    balcony=glass.buffer(balcony_depth,join_style=2).intersection(slab.buffer(-.12)).intersection(bw).difference(glass.buffer(.12)).buffer(-.06,join_style=2)
    # Pack sanitary box and king-bed clearance envelope inside real wall clearances.
    lb=local(base,deg,True);u0,v0,u1,v1=lb.bounds
    bath_candidates=[]
    for ui in range(max(0,math.floor((u1-u0-2.9)/.6))):
        u=u0+.3+ui*.6
        for vi in range(max(0,math.floor((v1-v0-2.7)/.5))):
            v=v0+.2+vi*.5
            bathlocal=box(u,v,u+2.6,v+2.4);bath=local(bathlocal,deg)
            if base.buffer(-.08).covers(bath) and not bath.buffer(.6).covers(Point(start)):bath_candidates.append((bathlocal,bath))
    bath_candidates.sort(key=lambda pair:pair[1].distance(Point(entry['point']))-.15*abs(pair[0].centroid.y))
    chosen=None;debug=dict(bathCandidates=len(bath_candidates),bedsFit=0,routes=0,startClear=base.buffer(-.5).covers(Point(start)),endClear=base.buffer(-.5).covers(Point(end)))
    for bathlocal,bath in bath_candidates:
        bu0,bv0,bu1,bv1=bathlocal.bounds
        side=1 if (bv0+bv1)/2<0 else -1
        bv=bv1 if side==1 else bv0;bu=(bu0+bu1)/2
        bathdoor=[worldpoint(bu-.45,bv,deg),worldpoint(bu+.45,bv,deg)]
        partitions=bath.boundary.buffer(.06,join_style=2).difference(LineString(bathdoor).buffer(.16,cap_style=2))
        net=base.difference(partitions)
        for du in [u1-2.7-i*.65 for i in range(max(0,math.floor((u1-u0-3.5)/.65)))]:
            if chosen:break
            for v in [v0+.5+i*.5 for i in range(max(0,math.floor((v1-v0-2.8)/.5)))]:
                bed=local(box(du,v,du+2.1,v+2),deg)
                if not base.buffer(-.35).covers(bed) or bath.buffer(.8).intersects(bed):continue
                debug['bedsFit']+=1
                free=base.difference(unary_union([bath,bed]))
                path=route_path(free,start,end)
                if not path:continue
                debug['routes']+=1
                bathaccess=worldpoint(bu,bv+side*.8,deg)
                bathpath=route_path(free,start,bathaccess)
                if not bathpath:continue
                chosen=(bath,partitions,net,bed,path,bathdoor,bathpath)
                break
        if chosen:break
    if chosen is None:
        failures.append(roomid+' furniture/route packing failed')
        bath=Polygon();partitions=Polygon();net=base;bed=Polygon();path=[];bathdoor=[];bathpath=[]
    else:bath,partitions,net,bed,path,bathdoor,bathpath=chosen
    # Distinguish v2 exact footprint retention from retention of program/area.
    oldmark=next(p for p in M['markers'] if p['name']=='ROOM_ANCHOR_'+roomid)
    r=oldmark['roomBoundsLocal'];oldpoly=box(20+r[0],10+r[1],20+r[2],10+r[3])
    outerwalls=gross.difference(base)
    entcut=LineString(entry['ends']).buffer(.3,cap_style=2)
    # Local tangent across glazing makes a 1.8 m sliding opening.
    d=glass.boundary.project(bp);p1=glass.boundary.interpolate(d-.9);p2=glass.boundary.interpolate(d+.9)
    balcdoor=[coords(p1),coords(p2)]
    outerwalls=outerwalls.difference(entcut).difference(LineString(balcdoor).buffer(.35,cap_style=2))
    room=dict(roomId=roomid,slot=slot,orientation=oldmark['orientation'],angleDegrees=deg,sectorWidthDegrees=width,
        targetInside=desired,targetBalcony=bal_target,grossArea=gross.area,netArea=net.area,
        internalPartitionArea=partitions.area,outerWallArea=gross.area-base.area,
        areaMethod='Inside face of 240 mm perimeter walls minus 120 mm sanitary partitions; sanitary floor included, balcony excluded. Door recesses excluded conservatively.',
        netDelta=net.area-desired,balconyNetArea=balcony.area,balconyDelta=balcony.area-bal_target,balconyOffsetDepth=balcony_depth,
        entry=entry,balconyDoor=dict(point=bc,ends=balcdoor,width=1.8),bathDoor=dict(ends=bathdoor,width=.9),
        originalFootprint=list(oldpoly.exterior.coords),oldFootprintOverlapM2=oldpoly.intersection(gross).area,
        footprintRetained=oldpoly.symmetric_difference(gross).area<.1,
        proposedCentroid=coords(gross.centroid),oldCentroid=coords(oldpoly.centroid),centroidShift=gross.centroid.distance(oldpoly.centroid),
        gross=polydata(gross),net=polydata(net),balcony=polydata(balcony),outerWalls=polydata(outerwalls),internalWalls=polydata(partitions),
        bath=polydata(bath),bed=polydata(bed),mainRoute=path,bathRoute=bathpath,
        debug=debug,usableProof='2.6 x 2.4 m sanitary envelope, 2.1 x 2.0 m bed, 1 m diameter route to balcony and sanitary door' if chosen else 'NOT PROVEN')
    rooms.append(room)
    print(roomid,'net',round(net.area,2),'balcony',round(balcony.area,2),'entryshift',round(entry['shift'],2),'packing',bool(chosen),debug,flush=True)

gross_polys=[Polygon(r['gross'][0]['shell']) for r in rooms]
residual=glass.difference(hall_outer.union(unary_union(gross_polys)))
deck_residual=slab.difference(glass).difference(unary_union([Polygon(p['shell']) for r in rooms for p in r['balcony']]))
checklist=[]
def check(name,ok,value):checklist.append(dict(name=name,passed=bool(ok),value=value))
check('eight_rooms',len(rooms)==8,len(rooms))
max_overlap=max(a.intersection(b).area for a,b in combinations(gross_polys,2))
check('no_room_overlap',max_overlap<.001,max_overlap)
balcony_polys=[Polygon(r['balcony'][0]['shell']) for r in rooms]
bal_overlap=max(a.intersection(b).area for a,b in combinations(balcony_polys,2))
check('no_private_balcony_overlap',bal_overlap<.001,bal_overlap)
check('no_core_or_corridor_overlap',all(p.intersection(hall_outer).area<.001 for p in gross_polys),'core/corridor retained')
check('all_rooms_within_B_glazing_envelope',all(p.difference(glass).area<.001 for p in gross_polys),'unchanged floor 15 B curve')
check('usable_net_close_to_v2',all(abs(r['netDelta'])<1 for r in rooms),[r['netDelta'] for r in rooms])
check('balcony_targets',all(abs(r['balconyDelta'])<.05 for r in rooms),[r['balconyDelta'] for r in rooms])
check('furniture_and_routes',not failures,failures)
check('entry_doors_reach_corridor',all(hall_outer.boundary.distance(Point(r['entry']['point']))<.001 for r in rooms),'1.10 m openings on straight frontage')
check('external_doors_reach_facade',all(glass.boundary.distance(Point(r['balconyDoor']['point']))<.001 for r in rooms),'1.80 m sliding openings')
data=dict(status='FLOOR 15 ONLY - NOT APPROVED',levelZ=50.4,roomCount=8,perimeterWallThickness=.24,partitionThickness=.12,
    core=polydata(core),corridor=polydata(hall),glazing=polydata(glass),slab=polydata(slab),
    rooms=rooms,residualIndoor=polydata(residual),residualIndoorArea=residual.area,deckReserve=polydata(deck_residual),deckReserveArea=deck_residual.area,
    residualDecision='Unallocated inter-suite space remains unresolved. Suggested shared sky gardens require facade openings and separate review; NOT included in suite areas.',
    checks=checklist,passed=all(c['passed'] for c in checklist),
    limits=['Space test only, not construction or accessibility approval','Core internal stairs, lifts, shafts and fire egress not resolved',
       '1m routes use static bed/bath envelopes; not full furniture or wheelchair certification','Residual space program not approved',
       'No 112-room replication; no booking or web manifest mutation'])
(OUT/'floor15-study.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('FLOOR_STUDY',data['passed'],'reserve',round(residual.area,1),'failures',failures)
