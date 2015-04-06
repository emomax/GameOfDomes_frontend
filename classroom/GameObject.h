
#include "Object.h"

#include <osgDB/ReadFile>
#include <osg/MatrixTransform>
#include <osg/ComputeBoundsVisitor>

#include <osg/Depth>
#include <osg/TexGen>
#include <osg/TextureCubeMap>
#include <osg/ShapeDrawable>
#include <osg/Geode>
#include <osgDB/ReadFile>
#include <osgUtil/CullVisitor>

class GameObject : public Object
{
public:
	GameObject()
	{
		rigidBodyRadius = 0.0;
		initTransform();
	}

	GameObject(std::string _name, osg::Vec3f _pos, std::string _model, osg::ref_ptr<osg::MatrixTransform> _scene);

	osg::ref_ptr<osg::Node> getModel(){ return model; }
	float getColRad() { return rigidBodyRadius; }
	//getModel();

	void setColRad(float _c) { rigidBodyRadius = _c; }
	void setModel(osg::ref_ptr<osg::Node> _m) { model = _m; }
	void setModel(std::string _fileName);

	virtual ~GameObject() {}

private:
	float rigidBodyRadius;
	osg::ref_ptr<osg::Node> model;

};
