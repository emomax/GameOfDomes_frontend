#include "Includes.h"

class Object : public osg::Transform
{
public:
	float getVel() { return velocity; }
	osg::Vec3f getDir() { return direction; }
	osg::ref_ptr<osg::MatrixTransform> getTrans() { return transform; }

	std::string getName() { return name; }
	std::string getDescr() { return description; }

	void initTransform();
	void setVel(float _v) { velocity = _v; }
	void setDir(osg::Vec3f _d) { direction = _d; }
	void translate(osg::Vec3f _t) { transform->postMult(osg::Matrix::translate(_t)); }
	void setTrans(osg::ref_ptr<osg::MatrixTransform> _t) { transform = _t; }
	void rotate(float _angle, osg::Vec3f _rotAxis);

	void addChildModel(osg::ref_ptr<osg::Node> _m) { transform->addChild(_m); }
	void removeChildModel(osg::ref_ptr<osg::Node> _m) { transform->removeChild(_m); }
	void scale(float _s) { transform->postMult(osg::Matrix::scale(osg::Vec3f(_s, _s, _s))); }

	void setName(std::string _n) { name = _n; }
	void setDescr(std::string _d) { description = _d; }

	virtual ~Object() {}

private:
		osg::ref_ptr<osg::MatrixTransform> transform;

		osg::Vec3f direction;
		float velocity;

		std::string name;
		std::string description;

};
